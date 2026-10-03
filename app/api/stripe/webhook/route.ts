import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { billingEnabled, planSlugForPrice, stripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";

/**
 * Stripe's webhook — the only writer of subscription state (Phase 6,
 * docs/billing.md for the events to send here).
 *
 * - The signature is checked against the raw body; anything else gets 400.
 * - An event is applied once: its id goes into `stripe_events` after it
 *   has been handled, and a redelivered one is acknowledged untouched.
 *   A failure answers 500 and records nothing, so Stripe retries it.
 * - An event only says which subscription changed. Its current state is
 *   read back from Stripe, so events arriving out of order can't roll a
 *   subscription back to an older state.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!billingEnabled() || !secret) {
    return NextResponse.json({ error: "Payments are not set up." }, { status: 404 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    logger.warn("billing: webhook with an invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  const subscriptions: Stripe.Subscription[] = [];
  try {
    for (const id of subscriptionIds(event)) {
      const subscription = await stripe().subscriptions.retrieve(id);
      await syncSubscription(admin, subscription);
      subscriptions.push(subscription);
    }
  } catch (error) {
    logger.error("billing: webhook event failed", { error, event: event.id, type: event.type });
    return NextResponse.json({ error: "Not processed." }, { status: 500 });
  }
  await trackPayment(admin, event, subscriptions);

  const { error } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  // 23505: the same event, handled at the same moment by another delivery.
  if (error && error.code !== "23505") {
    logger.error("billing: webhook event not recorded", { error, event: event.id });
  }
  return NextResponse.json({ received: true });
}

const idOf = (value: string | { id: string }) => (typeof value === "string" ? value : value.id);

/** The subscriptions an event is about; none for the ones we don't use. */
function subscriptionIds(event: Stripe.Event): string[] {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      return session.mode === "subscription" && session.subscription ? [idOf(session.subscription)] : [];
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return [event.data.object.id];
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription = event.data.object.parent?.subscription_details?.subscription;
      return subscription ? [idOf(subscription)] : [];
    }
    default:
      return [];
  }
}

/**
 * The funnel's last steps (docs/launch.md): `subscription_started` when
 * someone completes Checkout (a trial or a first payment), and
 * `payment_succeeded` for every invoice that took money — a trial's $0
 * invoice doesn't count. Sent once: a redelivered event stops at the
 * `stripe_events` check above.
 */
async function trackPayment(admin: SupabaseClient<Database>, event: Stripe.Event, subscriptions: Stripe.Subscription[]) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const [subscription] = subscriptions;
    const userId = session.client_reference_id ?? subscription?.metadata.user_id;
    if (session.mode !== "subscription" || !subscription || !userId) return;
    const price = subscription.items.data[0]?.price;
    await track("subscription_started", userId, {
      plan: price ? planSlugForPrice(price) : null,
      trial: subscription.status === "trialing",
    });
  }
  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    if (!invoice.amount_paid || !invoice.customer) return;
    const { data: customer } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", idOf(invoice.customer))
      .maybeSingle();
    if (!customer) return;
    await track("payment_succeeded", customer.user_id, {
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      reason: invoice.billing_reason,
    });
  }
}

