import type { Metadata } from "next";
import { pageMetadata } from "@/config/site";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolvePlanLimits } from "@/lib/generation/plan";
import { billingEnabled, TRIAL_DAYS } from "@/lib/billing/stripe";
import { listPlanOptions, readPaidSubscriptions } from "@/lib/billing/plans";
import { PlanComparison, type PlanActions } from "@/components/usage/PlanComparison";

export const metadata: Metadata = pageMetadata(
  "Pricing",
  "Start free, or go Pro for more generations and every template — with a free trial.",
  "/pricing",
);

/**
 * The public pricing page (Phase 6). The same plan comparison as Billing
 * & Plan; for a visitor who isn't signed in, every button starts with an
 * account.
 */
export default async function PricingPage() {
  const supabase = await createClient();
  const user = await getUser();
  const [plans, current, paid] = await Promise.all([
    listPlanOptions(supabase),
    user ? resolvePlanLimits(supabase, { type: "user", userId: user.id }) : null,
    user ? readPaidSubscriptions(supabase, user.id) : null,
  ]);

  const actions: PlanActions = !billingEnabled()
    ? { kind: "unavailable" }
    : !user
      ? { kind: "signup", trialDays: TRIAL_DAYS }
      : {
          kind: "checkout",
          trialDays: paid?.any ? null : TRIAL_DAYS,
          paying: ["active", "trialing", "past_due", "unpaid"].includes(paid?.latest?.status ?? ""),
        };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">Pricing</h1>
        <p className="text-ink-600">
          Start free. Upgrade when you need more — Pro starts with a {TRIAL_DAYS}-day free trial,
          and you can cancel any time under Billing &amp; Plan.
        </p>
      </header>
      <PlanComparison plans={plans} currentSlug={current?.planSlug ?? null} actions={actions} />
      <p className="text-sm text-ink-600">
        Prices are in US dollars and exclude tax, which is added at checkout for your country.
        Payments are handled by Stripe.
      </p>
    </main>
  );
}
