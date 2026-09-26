import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
}

/**
 * Plan comparison for Billing/Settings (architecture doc §9: "plan,
 * limits, upgrade — UI ready, payment later"; §18). Pure presentation of
 * what `plans`/`plan_limits` hold — the page reads them; nothing here is
 * hard-coded per plan except the display order. The upgrade buttons are
 * honest placeholders: payments (Stripe) are explicitly outside the MVP,
 * so they're disabled and say so rather than leading anywhere.
 */
export function PlanComparison({
  plans,
  currentSlug,
}: {
  plans: PlanOption[];
  currentSlug: PlanOption["slug"];
}) {
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
                <h3 className="font-medium text-ink-950">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-sm bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                    Current plan
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold text-ink-950">
                {plan.priceMonth === null
                  ? "Custom pricing"
                  : plan.priceMonth === 0
                    ? "Free"
                    : `$${plan.priceMonth}/month`}
              </p>
            </div>

            <ul className="flex-1 space-y-2 text-sm text-ink-800">
              <li>
                {plan.generationsPerMonth === null
                  ? "Unlimited generations"
                  : `${plan.generationsPerMonth} generations per month`}
              </li>
              <li>{plan.tools === "all" ? "Every tool" : `${plan.tools} tools`}</li>
              <li>
                {plan.premiumTemplates
                  ? "Full template library, including Pro templates"
                  : "Standard template library"}
              </li>
            </ul>

            {isCurrent ? (
              <Button variant="secondary" disabled>
                Your plan
              </Button>
            ) : index > currentIndex ? (
              <Button variant="upgrade" disabled title="Online payments aren't available yet">
                {plan.priceMonth === null ? "Contact sales — coming soon" : "Upgrade — coming soon"}
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
