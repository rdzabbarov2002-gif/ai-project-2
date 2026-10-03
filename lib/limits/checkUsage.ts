import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlanLimits } from "@/lib/generation/plan";
import type { UsagePeriod } from "@/lib/generation/period";

/**
 * Original Stage 1 contract (unchanged): callers get `allowed`, `remaining`,
 * and — on rejection — a `reason` telling them which check failed. Stage 5
 * fills in the implementation; nothing about the shape changed, so nothing
 * that types against this interface elsewhere needs to change either.
 */
export interface UsageCheckResult {
  allowed: boolean;
  remaining: number | "unlimited";
  reason?: "monthly_limit_reached" | "tool_not_in_plan" | "template_not_in_plan";
}

export async function checkUsage(params: {
  userId?: string;
  guestSessionId?: string;
  toolSlug: string;
  /** Stage 10: whether the requested template is flagged `is_premium` —
   *  an entitlement check of the same kind as tool-in-plan, so it lives
   *  here with it rather than as a separate gate in the pipeline. */
  templateIsPremium?: boolean;
  planLimits: PlanLimits;
  period: UsagePeriod;
  /** Service-role client — required because usage_counters has no
   *  client-facing read policy for this cross-period lookup pattern, and
   *  a guest's own generation count is only readable this way too (see
   *  lib/supabase/admin.ts for the full rationale). */
  admin: SupabaseClient<Database>;
}): Promise<UsageCheckResult> {
  const { planLimits } = params;

  const toolAllowed =
    planLimits.allowedToolSlugs === "all" ||
    planLimits.allowedToolSlugs.includes(params.toolSlug);

  if (!toolAllowed) {
    return { allowed: false, remaining: 0, reason: "tool_not_in_plan" };
  }

  if (params.templateIsPremium && !planLimits.premiumTemplates) {
    return { allowed: false, remaining: 0, reason: "template_not_in_plan" };
  }

  if (planLimits.maxGenerationsPerMonth === null) {
    return { allowed: true, remaining: "unlimited" };
  }

  const currentCount = params.userId
    ? await countUserGenerationsThisPeriod(params.admin, params.userId, params.period)
    : await countGuestGenerations(params.admin, params.guestSessionId);

  const allowed = currentCount < planLimits.maxGenerationsPerMonth;

  if (!allowed) {
    return { allowed: false, remaining: 0, reason: "monthly_limit_reached" };
  }

  // "Remaining after this one" — the request currently being checked
  // hasn't been saved yet, so it isn't in `currentCount`; subtracting 1
  // here reports what the caller will have left once it goes through
  // (returned with the generated result). Passive "left right now"
  // displays use resolveUsageSummary (./usageSummary.ts) instead.
  return { allowed: true, remaining: planLimits.maxGenerationsPerMonth - currentCount - 1 };
}

async function countUserGenerationsThisPeriod(
  admin: SupabaseClient<Database>,
  userId: string,
  period: UsagePeriod,
): Promise<number> {
  const { data } = await admin
    .from("usage_counters")
    .select("generations_count")
    .eq("user_id", userId)
    .eq("period_start", period.start)
    .maybeSingle();

  return data?.generations_count ?? 0;
}

/**
 * Guests have no `usage_counters` row (that table is scoped to `user_id`,
 * migration 0007) — a monthly period wouldn't mean much for a session
 * that's TTL'd out after `guestSessionTtlDays` anyway (config/settings.ts).
 * Counting the guest's own generations directly is simpler, exact, and
 * needs no separate table just for a state that only exists for ~30 days.
 */
async function countGuestGenerations(
  admin: SupabaseClient<Database>,
  guestSessionId: string | undefined,
): Promise<number> {
  if (!guestSessionId) return 0;

  const { count } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("guest_session_id", guestSessionId);

  return count ?? 0;
}
