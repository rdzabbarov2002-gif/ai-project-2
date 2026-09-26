import "server-only";
import Stripe from "stripe";
import type { PlanLimits } from "@/lib/generation/plan";

/**
 * Stripe (Phase 6, docs/billing.md). Payments are on when
 * STRIPE_SECRET_KEY is set — lib/env.ts then also requires the webhook
 * secret. Without it the upgrade buttons say payments aren't available
 * and the webhook refuses every request.
 *
 * STRIPE_API_BASE points the client at the local stand-in the end-to-end
 * tests run (e2e/mock-stripe.mjs); it is never set in a deployment.
 */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : undefined;
    client = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      maxNetworkRetries: 2,
      ...(base && {
        host: base.hostname,
        port: Number(base.port),
        protocol: base.protocol === "http:" ? "http" : "https",
      }),
    });
  }
  return client;
}

export type PaidPlanSlug = Exclude<PlanLimits["planSlug"], "free">;

/** The price each self-serve plan is sold at, by lookup key. */
export const CHECKOUT_PRICE: Partial<Record<PaidPlanSlug, string>> = { pro: "pro_monthly" };

/** Days of free trial on a first subscription. */
export const TRIAL_DAYS = 14;

/**
 * Which plan a Stripe price gives. Prices are named by their lookup key,
 * `<plan>_<anything>` — `pro_monthly`, or an `enterprise_…` price set up
 * for a customer by hand — so the mapping lives in Stripe with the price
 * itself, the same in test and live mode.
 */
export function planSlugForPrice(price: { lookup_key: string | null }): PaidPlanSlug | null {
  const plan = price.lookup_key?.split("_")[0];
  return plan === "pro" || plan === "enterprise" ? plan : null;
}
