import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveUsageSummary } from "@/lib/limits/usageSummary";
import { firstEmbed, type Embed } from "@/lib/supabase/embed";
import { UsageCard } from "@/components/usage/UsageCard";
import { PlanComparison, type PlanOption } from "@/components/usage/PlanComparison";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

const PLAN_ORDER: PlanOption["slug"][] = ["free", "pro", "enterprise"];

/**
 * Billing & Plan (Stage 13). Usage comes from the shared
 * resolveUsageSummary (lib/limits/usageSummary.ts — the same read the
 * Dashboard and tool page use); the subscription status is this page's
 * own extra read. No Stripe/payment/webhook logic — explicitly out of
 * scope for the MVP; this page only reads and displays what exists.
 *
 * Stage 13 completion (architecture doc §9 "plan, limits, upgrade"): a
 * comparison of the active plans, read from `plans`/`plan_limits`
 * (public-read reference tables, migration 0002) so it reflects the real
 * limits rather than a hand-written copy of them.
 */
export default async function BillingSettingsPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [summary, { data: subscription }, { data: plans }] = await Promise.all([
    resolveUsageSummary(supabase, user.id),
    // `subscriptions` allows a per-user history in principle (Stage 3);
    // most recent row is "the" current one, same tie-breaker already used
    // for company_profiles (Stage 12) and templates (Stage 7/10).
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("plans")
      .select(
        "slug, name, price_month, plan_limits(max_generations_per_month, allowed_tool_ids, premium_templates)",
      )
      .eq("is_active", true),
  ]);

  const planOptions: PlanOption[] = (plans ?? [])
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
      };
    })
    .sort((a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug));

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="max-w-2xl space-y-6">
        <h1 className="font-display text-xl font-semibold text-ink-950">Billing & Plan</h1>
        <UsageCard
          planSlug={summary.planLimits.planSlug}
          status={subscription?.status}
          used={summary.used}
          limit={summary.planLimits.maxGenerationsPerMonth}
        />
      </div>

      {planOptions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium text-ink-950">Plans</h2>
          <PlanComparison plans={planOptions} currentSlug={summary.planLimits.planSlug} />
          <p className="text-xs text-ink-600">
            Online upgrades are coming soon. Usage resets at the start of each calendar month
            (UTC).
          </p>
        </section>
      )}

      <section className="max-w-2xl space-y-3">
        <h2 className="font-medium text-ink-950">Delete account</h2>
        <p className="text-sm text-ink-600">
          Permanently deletes your account, company profile and generation history. This
          can&apos;t be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
