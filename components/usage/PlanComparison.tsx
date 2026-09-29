import Link from "next/link";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { openBillingPortal, startCheckout } from "@/app/(auth)/settings/billing/actions";
import { getMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";

export interface PlanOption {
  slug: "free" | "pro" | "enterprise";
  name: string;
  /** null = custom pricing. */
  priceMonth: number | null;
  /** null = unlimited. */
  generationsPerMonth: number | null;
  /** "all" or how many tools. */
  tools: "all" | number;
  premiumTemplates: boolean;
  /** Bought through Stripe Checkout (lib/billing/stripe.ts, CHECKOUT_PRICE). */
  selfServe: boolean;
}

/** What the buttons can do for this visitor. */
export type PlanActions =
  /** Payments aren't set up here (no STRIPE_SECRET_KEY). */
  | { kind: "unavailable" }
  /** Not signed in: every button starts with an account. */
  | { kind: "signup"; trialDays: number }
  /** Signed in: Checkout, or the Customer Portal for someone who pays. */
  | { kind: "checkout"; trialDays: number | null; paying: boolean };

/**
 * Plan comparison for the pricing page and Billing & Plan. Pure
 * presentation of what `plans`/`plan_limits` hold (lib/billing/plans.ts);
 * nothing here is hard-coded per plan except the display order. Buttons
 * are plain forms posting to the billing Server Actions, which redirect
 * to Stripe.
 */
export async function PlanComparison({
  plans,
  currentSlug,
  actions,
}: {
  plans: PlanOption[];
  /** null for a visitor who isn't signed in. */
  currentSlug: PlanOption["slug"] | null;
  actions: PlanActions;
}) {
  const t = await getMessages();
  const currentIndex = plans.findIndex((plan) => plan.slug === currentSlug);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((plan, index) => {
        const isCurrent = plan.slug === currentSlug;
        return (
          <Card
            key={plan.slug}
            className={clsx("flex flex-col gap-4", isCurrent && "border-accent ring-1 ring-accent")}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-ink-950">{t.plans.names[plan.slug] ?? plan.name}</h3>
                {isCurrent && <Badge>{t.plans.current}</Badge>}
              </div>
              <p className="text-lg font-semibold text-ink-950">
                {plan.priceMonth === null
                  ? t.plans.customPricing
                  : plan.priceMonth === 0
                    ? t.plans.free
                    : t.plans.perMonth(plan.priceMonth)}
              </p>
            </div>

            <ul className="flex-1 space-y-2 text-sm text-ink-800">
              <li>
                {plan.generationsPerMonth === null
                  ? t.plans.unlimited
                  : t.plans.generationsPerMonth(plan.generationsPerMonth)}
              </li>
              <li>{plan.tools === "all" ? t.plans.everyTool : t.plans.tools(plan.tools)}</li>
              <li>
                {plan.premiumTemplates ? t.plans.fullLibrary : t.plans.standardLibrary}
              </li>
            </ul>

            <PlanButton
              plan={plan}
              isCurrent={isCurrent}
              isUpgrade={currentSlug === null || index > currentIndex}
              actions={actions}
              t={t}
            />
          </Card>
        );
      })}
    </div>
  );
}

function PlanButton({
  plan,
  isCurrent,
  isUpgrade,
  actions,
  t,
}: {
  plan: PlanOption;
  isCurrent: boolean;
  isUpgrade: boolean;
  actions: PlanActions;
  t: Messages;
}) {
  const name = t.plans.names[plan.slug] ?? plan.name;
  if (isCurrent) {
    return actions.kind === "checkout" && actions.paying ? (
      <form action={openBillingPortal}>
        <Button type="submit" variant="secondary" className="w-full">
          {t.plans.manageBilling}
        </Button>
      </form>
    ) : (
      <Button variant="secondary" disabled>
        {t.plans.yourPlan}
      </Button>
    );
  }
  if (!isUpgrade) return null;

  if (!plan.selfServe && plan.priceMonth !== 0) {
    // Custom pricing is agreed in person; the feedback form reaches us.
    return (
      <Link href="/feedback" className={buttonClasses("secondary")}>
        {t.plans.contactUs}
      </Link>
    );
  }

  switch (actions.kind) {
    case "unavailable":
      return plan.priceMonth === 0 ? null : (
        <Button variant="upgrade" disabled title={t.plans.comingSoonTitle}>
          {t.plans.comingSoon}
        </Button>
      );
    case "signup":
      return (
        <Link href="/register" className={buttonClasses(plan.priceMonth === 0 ? "secondary" : "upgrade")}>
          {plan.priceMonth === 0 ? t.plans.startFree : t.plans.startTrial(actions.trialDays)}
        </Link>
      );
    case "checkout":
      return actions.paying ? null : (
        <form action={startCheckout}>
          <input type="hidden" name="plan" value={plan.slug} />
          <Button type="submit" variant="upgrade" className="w-full">
            {actions.trialDays ? t.plans.startTrial(actions.trialDays) : t.plans.upgradeTo(name)}
          </Button>
        </form>
      );
  }
}
