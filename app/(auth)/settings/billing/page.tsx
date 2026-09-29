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
import { getLocale, getMessages } from "@/lib/i18n/server";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

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

  const [locale, t] = await Promise.all([getLocale(), getMessages()]);
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
        <h1 className="font-display text-xl font-semibold text-ink-950">{t.billing.title}</h1>
        {searchParams.checkout === "success" && (
          <p role="status" className="text-sm text-ink-950">
            {t.billing.thanks}
          </p>
        )}
        {searchParams.billing === "unavailable" && (
          <p role="alert" className="text-sm text-danger">
            {t.billing.unavailable}
          </p>
        )}
        <UsageCard
          planSlug={summary.planLimits.planSlug}
          used={summary.used}
          limit={summary.planLimits.maxGenerationsPerMonth}
        />
        {paid.latest && (
          <SubscriptionCard subscription={paid.latest} manage={billingEnabled()} locale={locale} t={t} />
        )}
      </div>

      {planOptions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium text-ink-950">{t.billing.plans}</h2>
          <PlanComparison
            plans={planOptions}
            currentSlug={summary.planLimits.planSlug}
            actions={actions}
          />
          <p className="text-xs text-ink-600">{t.billing.footnote}</p>
        </section>
      )}

      <section className="max-w-2xl space-y-3">
        <h2 className="font-medium text-ink-950">{t.billing.deleteTitle}</h2>
        <p className="text-sm text-ink-600">{t.billing.deleteText}</p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}

/** The paid subscription, in words — as the webhook last stored it. */
function SubscriptionCard({
  subscription,
  manage,
  locale,
  t,
}: {
  subscription: PaidSubscription;
  manage: boolean;
  locale: Locale;
  t: Messages;
}) {
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
      : t.billing.endOfPeriod;
  const { status, periodEnd, trialEnd, cancelAtPeriodEnd } = subscription;
  const planName = t.plans.names[subscription.planName.toLowerCase()] ?? subscription.planName;
  let text: string;
  let problem = false;
  if (status === "trialing") {
    text = cancelAtPeriodEnd
      ? t.billing.trialEnding(planName, formatDate(trialEnd))
      : t.billing.trial(planName, formatDate(trialEnd));
  } else if (status === "active") {
    text = cancelAtPeriodEnd
      ? t.billing.ending(planName, formatDate(periodEnd))
      : t.billing.renews(planName, formatDate(periodEnd));
  } else if (status === "past_due" || status === "unpaid") {
    problem = true;
    text = t.billing.failed(planName);
  } else if (status === "incomplete") {
    problem = true;
    text = t.billing.incomplete(planName);
  } else {
    text = t.billing.ended(planName);
  }

  return (
    <Card className="space-y-3">
      <p className={problem ? "text-sm text-danger" : "text-sm text-ink-950"}>{text}</p>
      {manage && PAYING.includes(status) && (
        <form action={openBillingPortal}>
          <Button type="submit" variant="secondary">
            {problem ? t.billing.updatePayment : t.billing.manage}
          </Button>
        </form>
      )}
    </Card>
  );
}
