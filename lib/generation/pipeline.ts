import "server-only";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, AIProviderError, type AIProviderName } from "@/lib/ai-provider";
import { appSettings } from "@/config/settings";
import { resolveIdentity } from "./identity";
import { resolveTool, resolveTemplate } from "./catalog";
import { resolvePlanLimits } from "./plan";
import { checkUsage } from "@/lib/limits/checkUsage";
import { resolveCompanyContext } from "./company-context";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { saveGeneration, incrementUsage } from "./save";
import { currentMonthPeriod } from "./period";
import { GenerationError } from "./errors";
import type { GenerateRequestBody } from "./validate";

export interface GenerateResult {
  id: string | null;
  saved: boolean;
  toolSlug: string;
  templateSlug: string | null;
  output: string;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  remaining: number | "unlimited";
  /** Echoed back so a first-time guest (no token existed client-side yet
   *  is impossible today — Stage 2 always creates one before this route
   *  can be called — but this keeps the response self-describing if that
   *  ever changes). */
  guestSessionToken?: string;
}

/**
 * The Core Generate Pipeline. One linear sequence, one reason to fail at
 * each step, one place (the route handler) that turns a failure into an
 * HTTP response. Every step after this stage's Stage 8-10 tools get built
 * runs unchanged — a new tool is a new `tools`/`templates` row, not a
 * branch in this function. Steps are numbered in comments to match the
 * Stage 5 requirements list one-to-one, so it's checkable at a glance.
 */
export async function runGeneration(body: GenerateRequestBody): Promise<GenerateResult> {
  const userClient = createUserClient();
  const adminClient = createAdminClient();

  // 1. Identify the caller — signed-in user, or guest session (created/
  // refreshed here if needed; see identity.ts).
  const identity = await resolveIdentity({
    userClient,
    adminClient,
    guestSessionToken: body.guestSessionToken,
  });
  if (!identity) {
    throw new GenerationError(
      "unauthorized",
      401,
      "Sign in or include a guest session token.",
    );
  }

  // 2. Tool must exist and be active. Inactive and nonexistent look
  // identical here by design (see catalog.ts) — nothing to branch on.
  const tool = await resolveTool(userClient, body.toolSlug);
  if (!tool) {
    throw new GenerationError("tool_unavailable", 404, "This tool is not available.");
  }

  // 3. Template is optional; if named, it must exist for this tool.
  const template = body.templateSlug
    ? await resolveTemplate(userClient, body.templateSlug, tool.id)
    : null;
  if (body.templateSlug && !template) {
    throw new GenerationError("template_unavailable", 404, "This template is not available.");
  }

  // 4. Resolve the caller's plan limits (free plan for every guest).
  const planLimits = await resolvePlanLimits(userClient, identity);

  // 5. Usage limits — tool-in-plan and monthly-count in one check
  // (lib/limits/checkUsage.ts owns both, per its Stage 1 contract).
  const period = currentMonthPeriod();
  const usage = await checkUsage({
    userId: identity.type === "user" ? identity.userId : undefined,
    guestSessionId: identity.type === "guest" ? identity.guestSessionId : undefined,
    toolSlug: tool.slug,
    planLimits,
    period,
    admin: adminClient,
  });
  if (!usage.allowed) {
    const message =
      usage.reason === "tool_not_in_plan"
        ? "This tool isn't included in your current plan."
        : "You've reached your generation limit for this period.";
    throw new GenerationError(
      usage.reason === "tool_not_in_plan" ? "tool_not_in_plan" : "usage_limit_reached",
      usage.reason === "tool_not_in_plan" ? 403 : 429,
      message,
    );
  }

  // 6. Company context — real profile for a user, draft for a guest.
  // Never blocks generation; a missing profile just means a more generic
  // prompt (see prompt.ts).
  const { companyProfileId, context } = await resolveCompanyContext({
    userClient,
    identity,
    requestedCompanyProfileId: body.companyProfileId,
  });

  // 7. Build the single prompt every tool shares the assembly logic for.
  const systemPrompt = buildSystemPrompt(context, tool);
  const userPrompt = buildUserPrompt({ tool, template, inputParams: body.inputParams });

  // 8. Call the AI Provider Gateway — never a vendor SDK directly. The
  // only import of `@/lib/ai-provider` in this whole pipeline is this
  // one, right here.
  const { providerName, model } = selectProviderAndModel(planLimits);
  let aiResult;
  try {
    aiResult = await getProvider(providerName).generate({
      systemPrompt,
      userPrompt,
      model,
      maxTokens: appSettings.maxOutputTokens,
    });
  } catch (error) {
    // 9. AIProviderError carries a `kind`/`retryable` the route maps to a
    // safe HTTP response (see route.ts) — nothing provider-specific
    // leaks past this catch. Anything that *isn't* an AIProviderError
    // (a bug in the gateway itself) is wrapped so the route only ever
    // has one error shape to branch on from this step onward.
    if (error instanceof AIProviderError) throw error;
    throw new GenerationError(
      "generation_failed",
      500,
      "Something went wrong generating your content.",
    );
  }

  // 10. Persist. Never throws — a storage hiccup doesn't discard an
  // already-generated (already-paid-for) result; see save.ts.
  const outcome = await saveGeneration({
    userClient,
    adminClient,
    identity,
    tool,
    template,
    companyProfileId,
    inputParams: body.inputParams,
    result: aiResult,
  });

  // 11. Usage counters — user-only; guest usage is derived on read.
  await incrementUsage(adminClient, identity, period);

  // 12. Unified response shape regardless of guest vs. authenticated.
  return {
    id: outcome.id,
    saved: outcome.saved,
    toolSlug: tool.slug,
    templateSlug: template?.slug ?? null,
    output: aiResult.text,
    provider: aiResult.provider,
    model: aiResult.model,
    usage: aiResult.usage,
    remaining: usage.remaining,
    guestSessionToken: identity.type === "guest" ? body.guestSessionToken : undefined,
  };
}

/**
 * Exactly one provider is actually implemented today (Stage 4 — Claude;
 * the other four are typed stubs). This still resolves the choice through
 * the plan's `allowedAiModels` rather than hardcoding "claude" outright,
 * so turning on a second provider later (post-MVP, per the architecture
 * doc's own roadmap) is extending this list and the map below — not
 * touching the pipeline that calls it.
 *
 * `DEFAULT_AI_PROVIDER` (config/settings.ts) decides which implemented
 * provider is tried first when a plan allows several — until Phase 1 that
 * env var was documented but read by nothing on this path.
 */
const IMPLEMENTED_PROVIDERS: AIProviderName[] = ["claude"];

const MODEL_BY_PROVIDER: Partial<Record<AIProviderName, string>> = {
  claude: appSettings.defaultAIModel,
};

function selectProviderAndModel(planLimits: {
  allowedAiModels: "all" | AIProviderName[];
}): { providerName: AIProviderName; model: string } {
  const allowed =
    planLimits.allowedAiModels === "all" ? IMPLEMENTED_PROVIDERS : planLimits.allowedAiModels;

  const preferred = appSettings.defaultAIProvider as AIProviderName;
  const candidates = IMPLEMENTED_PROVIDERS.includes(preferred)
    ? [preferred, ...IMPLEMENTED_PROVIDERS.filter((p) => p !== preferred)]
    : IMPLEMENTED_PROVIDERS;
  const providerName = candidates.find((p) => allowed.includes(p));
  const model = providerName ? MODEL_BY_PROVIDER[providerName] : undefined;

  if (!providerName || !model) {
    throw new GenerationError(
      "no_provider_available",
      500,
      "No AI provider is currently available for your plan.",
    );
  }

  return { providerName, model };
}
