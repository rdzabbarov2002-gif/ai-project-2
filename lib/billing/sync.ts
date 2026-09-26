import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";
import { planSlugForPrice } from "./stripe";

export type SyncResult = "unchanged" | "updated" | "skipped";

const iso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;
const sameInstant = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && Date.parse(a) === Date.parse(b));

/**
 * Writes one Stripe subscription, as Stripe has it now, into our
 * `subscriptions` table (one row per Stripe subscription, by its id).
 * The webhook and the nightly reconciliation both pass a subscription
 * they have just fetched from Stripe — never an event's copy of it, which
 * can be older than one already applied: events arrive out of order.
 *
 * "skipped" means the subscription can't be placed — a customer we don't
 * know, or a price that isn't one of ours. That is logged (and reaches
 * Sentry); retrying wouldn't help.
 */
export async function syncSubscription(
  admin: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
): Promise<SyncResult> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { data: customer } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  // The checkout also writes the user into the subscription's metadata.
  const userId = customer?.user_id ?? subscription.metadata?.user_id;
  if (!userId) {
    logger.error("billing: subscription of an unknown customer", {
      subscription: subscription.id,
      customer: customerId,
    });
    return "skipped";
  }

  const item = subscription.items.data[0];
  const planSlug = item ? planSlugForPrice(item.price) : null;
  const { data: plan } = planSlug
    ? await admin.from("plans").select("id").eq("slug", planSlug).maybeSingle()
    : { data: null };
  if (!item || !plan) {
    logger.error("billing: subscription to a price that isn't a plan", {
      subscription: subscription.id,
      price: item?.price.id,
    });
    return "skipped";
  }

  const row = {
    user_id: userId,
    plan_id: plan.id,
    status: subscription.status,
    provider_ref: subscription.id,
    period_end: iso(item.current_period_end),
    trial_end: iso(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };

  const { data: stored } = await admin
    .from("subscriptions")
    .select("user_id, plan_id, status, period_end, trial_end, cancel_at_period_end")
    .eq("provider_ref", subscription.id)
    .maybeSingle();
  if (
    stored &&
    stored.user_id === row.user_id &&
    stored.plan_id === row.plan_id &&
    stored.status === row.status &&
    stored.cancel_at_period_end === row.cancel_at_period_end &&
    sameInstant(stored.period_end, row.period_end) &&
    sameInstant(stored.trial_end, row.trial_end)
  ) {
    return "unchanged";
  }

  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "provider_ref" });
  if (error) throw new Error(`billing: saving subscription ${subscription.id} failed: ${error.message}`);
  return "updated";
}
