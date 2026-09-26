import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolvePlanLimits, type PlanLimits } from "@/lib/generation/plan";
import { currentMonthPeriod } from "@/lib/generation/period";

export interface UsageSummary {
  planLimits: PlanLimits;
  /** Generations counted in the current period. */
  used: number;
  /** Left right now (not "after the next one" — that's checkUsage's
   *  `remaining`); null = unlimited. */
  remaining: number | null;
}

/**
 * "How much of this month's allowance has this user used" — for display.
 * Stage 13 wrote this read inline on the Dashboard and Billing pages and
 * deliberately didn't share it between two pages; Stage 13's completion
 * adds a third reader (the tool page's up-front "N left" hint,
 * architecture doc §10), which is where one shared read stops being
 * premature.
 *
 * Same data path as before: `resolvePlanLimits` (Stage 5) plus the user's
 * own `usage_counters` row through the request-scoped client and its
 * owner-select RLS policy (migration 0007) — not `checkUsage()`, which
 * answers "may this run now" and needs the admin client.
 */
export async function resolveUsageSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UsageSummary> {
  const [planLimits, { data: usage }] = await Promise.all([
    resolvePlanLimits(supabase, { type: "user", userId }),
    supabase
      .from("usage_counters")
      .select("generations_count")
      .eq("user_id", userId)
      .eq("period_start", currentMonthPeriod().start)
      .maybeSingle(),
  ]);

  const used = usage?.generations_count ?? 0;
  const limit = planLimits.maxGenerationsPerMonth;

  return { planLimits, used, remaining: limit === null ? null : Math.max(0, limit - used) };
}
