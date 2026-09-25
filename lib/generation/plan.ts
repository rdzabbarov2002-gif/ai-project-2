import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AIProviderName } from "@/lib/ai-provider";

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
}

const FREE_PLAN_SLUG = "free";

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
    .select("slug, plan_limits(max_generations_per_month, max_saved_results, allowed_tool_ids, allowed_ai_models)")
    .eq("slug", planSlug)
    .single();

  if (error || !data || !data.plan_limits) {
    // Seed data missing or a plan with no matching plan_limits row — fail
    // closed (zero generations allowed) rather than open (unlimited),
    // since the alternative failure mode is silently free AI usage.
    return {
      planSlug: FREE_PLAN_SLUG,
      maxGenerationsPerMonth: 0,
      maxSavedResults: 0,
      allowedToolSlugs: [],
      allowedAiModels: [],
    };
  }

  // Cast rather than lean on inferred typing: database.types.ts is
  // hand-written (see Stage 3 audit) and doesn't carry the `Relationships`
  // metadata supabase-js uses to type nested embeds like `plan_limits(...)`
  // precisely — the shape below is correct per the migration, but wasn't
  // checked against a real generated type. Re-verify once
  // `supabase gen types` replaces the hand-written file.
  const rawLimits = data.plan_limits as unknown as
    | {
        max_generations_per_month: number | null;
        max_saved_results: number | null;
        allowed_tool_ids: unknown;
        allowed_ai_models: unknown;
      }
    | Array<{
        max_generations_per_month: number | null;
        max_saved_results: number | null;
        allowed_tool_ids: unknown;
        allowed_ai_models: unknown;
      }>;
  const limits = Array.isArray(rawLimits) ? rawLimits[0] : rawLimits;

  return {
    planSlug: data.slug as "free" | "pro" | "enterprise",
    maxGenerationsPerMonth: limits.max_generations_per_month,
    maxSavedResults: limits.max_saved_results,
    allowedToolSlugs: normalizeSlugList(limits.allowed_tool_ids),
    allowedAiModels: normalizeSlugList(limits.allowed_ai_models) as "all" | AIProviderName[],
  };
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
