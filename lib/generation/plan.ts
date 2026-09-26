import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AIProviderName } from "@/lib/ai-provider";
import { appSettings } from "@/config/settings";

/**
 * Resolved, ready-to-use view of a plan's limits — the app-facing shape
 * `checkUsage` and provider selection consume, decoupled from the raw
 * `plan_limits` row shape (jsonb `"all" | string[]` columns normalized
 * here once, instead of every caller re-checking `=== "all"`).
 */
export interface PlanLimits {
  planSlug: "free" | "pro" | "enterprise";
  maxGenerationsPerMonth: number | null; // null = unlimited
  maxSavedResults: number | null;
  allowedToolSlugs: "all" | string[];
  allowedAiModels: "all" | AIProviderName[];
  /** Whether templates flagged `is_premium` are included (migration 0016). */
  premiumTemplates: boolean;
}

const FREE_PLAN_SLUG = "free";

/**
 * Seed data missing or a plan with no matching plan_limits row — fail
 * closed (zero generations allowed) rather than open (unlimited), since
 * the alternative failure mode is silently free AI usage.
 */
const FAIL_CLOSED_LIMITS: PlanLimits = {
  planSlug: FREE_PLAN_SLUG,
  maxGenerationsPerMonth: 0,
  maxSavedResults: 0,
  allowedToolSlugs: [],
  allowedAiModels: [],
  premiumTemplates: false,
};

/**
 * Both branches read through the request-scoped client (`plans`/
 * `plan_limits` are public-read reference tables per migration 0002 — no
 * need for the service-role client here), which is what keeps this safe to
 * call before any auth/guest-session check has happened.
 */
export async function resolvePlanLimits(
  supabase: SupabaseClient<Database>,
  identity: { type: "user"; userId: string } | { type: "guest" },
): Promise<PlanLimits> {
  const planSlug =
    identity.type === "user"
      ? await resolveUserPlanSlug(supabase, identity.userId)
      : FREE_PLAN_SLUG;

  const { data, error } = await supabase
    .from("plans")
    .select(
      "slug, plan_limits(max_generations_per_month, max_saved_results, allowed_tool_ids, allowed_ai_models, premium_templates)",
    )
    .eq("slug", planSlug)
    .single();

  if (error || !data || !data.plan_limits) {
    return FAIL_CLOSED_LIMITS;
  }

  // Cast rather than lean on inferred typing: both embed shapes — object
  // for the one-to-one `plan_limits.plan_id unique`, array otherwise — are
  // accepted here.
  const rawLimits = data.plan_limits as unknown as
    | {
        max_generations_per_month: number | null;
        max_saved_results: number | null;
        allowed_tool_ids: unknown;
        allowed_ai_models: unknown;
        premium_templates: boolean | null;
      }
    | Array<{
        max_generations_per_month: number | null;
        max_saved_results: number | null;
        allowed_tool_ids: unknown;
        allowed_ai_models: unknown;
        premium_templates: boolean | null;
      }>;
  const limits = Array.isArray(rawLimits) ? rawLimits[0] : rawLimits;
  // An embed can also come back as an empty array (no plan_limits row) —
  // same fail-closed answer as above, not a crash on `limits.…` below.
  if (!limits) return FAIL_CLOSED_LIMITS;

  const resolved: PlanLimits = {
    planSlug: data.slug as "free" | "pro" | "enterprise",
    maxGenerationsPerMonth: limits.max_generations_per_month,
    maxSavedResults: limits.max_saved_results,
    allowedToolSlugs: normalizeSlugList(limits.allowed_tool_ids),
    allowedAiModels: normalizeSlugList(limits.allowed_ai_models) as "all" | AIProviderName[],
    premiumTemplates: limits.premium_templates === true,
  };

  // Stage 11: a guest is on the Free plan, capped at the guest allowance
  // (architecture doc §8 — "more than 3 generations → registration").
  // Capped here, once, so checkUsage and every other consumer see one
  // consistent number instead of each re-deriving the guest rule.
  if (identity.type === "guest") {
    const guestLimit = appSettings.guestGenerationLimit;
    resolved.maxGenerationsPerMonth =
      resolved.maxGenerationsPerMonth === null
        ? guestLimit
        : Math.min(resolved.maxGenerationsPerMonth, guestLimit);
  }

  return resolved;
}

async function resolveUserPlanSlug(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"free" | "pro" | "enterprise"> {
  const { data } = await supabase
    .from("users")
    .select("plans(slug)")
    .eq("id", userId)
    .single();

  // Same caveat as above: cast, not inferred — see comment in resolvePlanLimits.
  const rawPlan = data?.plans as unknown as { slug: string } | { slug: string }[] | null;
  const plan = rawPlan ? (Array.isArray(rawPlan) ? rawPlan[0] : rawPlan) : null;
  return (plan?.slug as "free" | "pro" | "enterprise" | undefined) ?? FREE_PLAN_SLUG;
}

function normalizeSlugList(value: unknown): "all" | string[] {
  if (value === "all") return "all";
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}
