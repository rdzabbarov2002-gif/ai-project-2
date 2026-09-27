import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveUsageSummary } from "@/lib/limits/usageSummary";
import { billingEnabled, TRIAL_DAYS } from "@/lib/billing/stripe";
import { listPlanOptions, readPaidSubscriptions, type PaidSubscription } from "@/lib/billing/plans";
import { UsageCard } from "@/components/usage/UsageCard";
import { PlanComparison, type PlanActions } from "@/components/usage/PlanComparison";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { openBillingPortal } from "./actions";

/** Statuses in which the person still has a subscription to manage. */
const PAYING = ["active", "trialing", "past_due", "unpaid"];

/**
 * Billing & Plan (Stage 13; payments since Phase 6, docs/billing.md).
 * Usage comes from the shared resolveUsageSummary (lib/limits/
 * usageSummary.ts — the same read the Dashboard and tool page use); the
 * plan comparison and the paid subscription from lib/billing/plans.ts.
 * Buying goes to Stripe Checkout, everything after that — plan changes,
 * cards, cancelling, invoices — to Stripe's Customer Portal. The page
 * only shows what the webhook stored.
 */
export default async function BillingSettingsPage(props: {
  searchParams: Promise<{ checkout?: string; billing?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const [summary, planOptions, paid] = await Promise.all([
    resolveUsageSummary(supabase, user.id),
    listPlanOptions(supabase),
    readPaidSubscriptions(supabase, user.id),
  ]);
  const paying = paid.latest !== null && PAYING.includes(paid.latest.status);
  const actions: PlanActions = billingEnabled()
    ? { kind: "checkout", trialDays: paid.any ? null : TRIAL_DAYS, paying }
    : { kind: "unavailable" };

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="max-w-2xl space-y-6">
        <h1 className="font-display text-xl font-semibold text-ink-950">Billing & Plan</h1>
        {searchParams.checkout === "success" && (
          <p role="status" className="text-sm text-ink-950">
            Thank you — your subscription is starting. It can take a few seconds to show here;
            refresh if it doesn&apos;t.
          </p>
        )}
        {searchParams.billing === "unavailable" && (
          <p role="alert" className="text-sm text-danger">
            Payments aren&apos;t available right now. Please try again in a few minutes.
          </p>
        )}
        <UsageCard
          planSlug={summary.planLimits.planSlug}
          used={summary.used}
          limit={summary.planLimits.maxGenerationsPerMonth}
        />
        {paid.latest && <SubscriptionCard subscription={paid.latest} manage={billingEnabled()} />}
      </div>

      {planOptions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium text-ink-950">Plans</h2>
          <PlanComparison
            plans={planOptions}
            currentSlug={summary.planLimits.planSlug}
            actions={actions}
          />
          <p className="text-xs text-ink-600">
            Prices exclude tax, which is added at checkout for your country. Usage resets at
            the start of each calendar month (UTC).
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

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
    : "the end of the period";

/** The paid subscription, in words — as the webhook last stored it. */
function SubscriptionCard({ subscription, manage }: { subscription: PaidSubscription; manage: boolean }) {
  const { status, planName, periodEnd, trialEnd, cancelAtPeriodEnd } = subscription;
  let text: string;
  let problem = false;
  if (status === "trialing") {
    text = cancelAtPeriodEnd
      ? `${planName} free trial until ${formatDate(trialEnd)}. It ends then — you won't be charged.`
      : `${planName} free trial until ${formatDate(trialEnd)}, then your card is charged.`;
  } else if (status === "active") {
    text = cancelAtPeriodEnd
      ? `${planName} until ${formatDate(periodEnd)}. It won't renew.`
      : `${planName}, renews on ${formatDate(periodEnd)}.`;
  } else if (status === "past_due" || status === "unpaid") {
    problem = true;
    text = `Your last payment for ${planName} failed. Update your card to get ${planName} back — until then you're on the Free plan.`;
  } else if (status === "incomplete") {
    problem = true;
    text = `The first payment for ${planName} wasn't completed.`;
  } else {
    text = `Your ${planName} subscription has ended.`;
  }

  return (
    <Card className="space-y-3">
      <p className={problem ? "text-sm text-danger" : "text-sm text-ink-950"}>{text}</p>
      {manage && PAYING.includes(status) && (
        <form action={openBillingPortal}>
          <Button type="submit" variant="secondary">
            {problem ? "Update payment method" : "Manage billing"}
          </Button>
        </form>
      )}
    </Card>
  );
}
