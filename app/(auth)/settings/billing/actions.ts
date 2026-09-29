"use server";

import { redirect } from "next/navigation";
import { getMessages } from "@/lib/i18n/server";
import type { User } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnabled, CHECKOUT_PRICE, stripe, TRIAL_DAYS, type PaidPlanSlug } from "@/lib/billing/stripe";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { track } from "@/lib/analytics";

export interface DeleteAccountState {
  error: string | null;
}

/** Where a payment step that couldn't start sends the person back to. */
const UNAVAILABLE = "/settings/billing?billing=unavailable";

/**
 * Deletes the signed-in user's account and everything it owns (GDPR
 * right to erasure). Removing the Auth user cascades through the foreign
 * keys: public.users (0003), then company_profiles, usage_counters,
 * subscriptions, generations, feedback and the Stripe customer link —
 * covered by supabase/tests/account-deletion.test.sql. Needs the service
 * role: users can't delete Auth accounts themselves.
 *
 * A paying customer is deleted in Stripe first, which ends their
 * subscription there at once: otherwise Stripe would go on charging a
 * card for an account that no longer exists. If that fails, the account
 * stays.
 */
export async function deleteAccount(): Promise<DeleteAccountState> {
  const user = await requireUser();
  const admin = createAdminClient();
  const t = await getMessages();

  const { data: customer } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (customer && billingEnabled()) {
    try {
      await stripe().customers.del(customer.stripe_customer_id);
    } catch (error) {
      logger.error("account: Stripe customer not deleted", { error });
      return { error: t.billing.cancelFailed };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logger.error("account: delete failed", { error });
    return { error: t.billing.deleteFailed };
  }

  await track("account_deleted", user.id);

  // Clears the session cookies; the session itself died with the account.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Sends the user to Stripe Checkout for a paid plan (Phase 6,
 * docs/billing.md). The subscription it creates reaches our database only
 * through the webhook. A first subscription starts with a free trial;
 * Stripe Tax adds the tax for the customer's address. Someone who already
 * pays goes to the Customer Portal instead of into a second subscription.
 */
export async function startCheckout(formData: FormData): Promise<void> {
  const user = await requireUser();
  const plan = String(formData.get("plan") ?? "") as PaidPlanSlug;
  const lookupKey = CHECKOUT_PRICE[plan];
  if (!billingEnabled() || !lookupKey) redirect("/settings/billing");

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .not("provider_ref", "is", null);
  if (subscriptions?.some((row) => ["active", "trialing", "past_due", "unpaid"].includes(row.status))) {
    return openBillingPortal();
  }

  let url: string | null;
  try {
    const [price] = (await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data;
    if (!price) throw new Error(`No active Stripe price with lookup key ${lookupKey}`);
    const origin = await getSiteUrl();
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: await customerFor(user),
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        // One free trial per person: none after any earlier subscription.
        ...(subscriptions?.length ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      automatic_tax: { enabled: true },
      customer_update: { address: "auto", name: "auto" },
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing`,
    });
    url = session.url;
  } catch (error) {
    logger.error("billing: checkout not started", { error });
    url = null;
  }
  redirect(url ?? UNAVAILABLE);
}

/**
 * Stripe's Customer Portal: change plan, update the card, cancel, and see
 * invoices — instead of a billing interface of our own.
 */
export async function openBillingPortal(): Promise<void> {
  const user = await requireUser();
  const { data: customer } = await createAdminClient()
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!billingEnabled() || !customer) redirect("/settings/billing");

  let url: string | null;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${await getSiteUrl()}/settings/billing`,
    });
    url = session.url;
  } catch (error) {
    logger.error("billing: portal not opened", { error });
    url = null;
  }
  redirect(url ?? UNAVAILABLE);
}

/**
 * The user's Stripe customer, created on their first checkout. The
 * idempotency key keeps a double click from making two; the unique
 * user_id keeps a second one from being linked.
 */
async function customerFor(user: User): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing.stripe_customer_id;

  const customer = await stripe().customers.create(
    { email: user.email, metadata: { user_id: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );
  const { error } = await admin
    .from("billing_customers")
    .insert({ user_id: user.id, stripe_customer_id: customer.id });
  if (error && error.code !== "23505") throw new Error(`Customer link not saved: ${error.message}`);
  return customer.id;
}
