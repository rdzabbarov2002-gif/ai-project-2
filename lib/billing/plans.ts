import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { firstEmbed, type Embed } from "@/lib/supabase/embed";
import type { PlanOption } from "@/components/usage/PlanComparison";
import { CHECKOUT_PRICE } from "./stripe";

const PLAN_ORDER: PlanOption["slug"][] = ["free", "pro", "enterprise"];

/**
 * The active plans with their limits, cheapest first — for the pricing
 * page and Billing & Plan. Read from `plans`/`plan_limits` (public-read
 * reference tables, migration 0002), so the comparison shows the real
 * limits rather than a hand-written copy of them.
 */
export async function listPlanOptions(supabase: SupabaseClient<Database>): Promise<PlanOption[]> {
  const { data: plans } = await supabase
    .from("plans")
    .select("slug, name, price_month, plan_limits(max_generations_per_month, allowed_tool_ids, premium_templates)")
    .eq("is_active", true);

  return (plans ?? [])
    .map((plan) => {
      const limits = firstEmbed(
        plan.plan_limits as unknown as Embed<{
          max_generations_per_month: number | null;
          allowed_tool_ids: unknown;
          premium_templates: boolean;
        }>,
      );
      return {
        // plans.slug is limited to these three by its CHECK constraint (0002).
        slug: plan.slug as PlanOption["slug"],
        name: plan.name,
        priceMonth: plan.price_month,
        // null is meaningful here (unlimited) — only a missing limits row
        // falls back to 0, failing closed like resolvePlanLimits does.
        generationsPerMonth: limits ? limits.max_generations_per_month : 0,
        tools: Array.isArray(limits?.allowed_tool_ids)
          ? limits.allowed_tool_ids.length
          : limits?.allowed_tool_ids === "all"
            ? ("all" as const)
            : 0,
        premiumTemplates: limits?.premium_templates === true,
        selfServe: plan.slug in CHECKOUT_PRICE,
      };
    })
    .sort((a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug));
}

export interface PaidSubscription {
  status: string;
  planName: string;
  periodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * The user's Stripe subscriptions, newest first, as the webhook stored
 * them (their own rows; RLS lets them read these). `latest` is what
 * Billing & Plan describes; any row at all means the free trial has been
 * used and a Stripe customer exists for the Customer Portal.
 */
export async function readPaidSubscriptions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ latest: PaidSubscription | null; any: boolean }> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, period_end, trial_end, cancel_at_period_end, plans(name)")
    .eq("user_id", userId)
    .not("provider_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (!row) return { latest: null, any: false };
  const plan = firstEmbed(row.plans as unknown as Embed<{ name: string }>);
  return {
    latest: {
      status: row.status,
      planName: plan?.name ?? "Paid plan",
      periodEnd: row.period_end,
      trialEnd: row.trial_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
    },
    any: true,
  };
}
