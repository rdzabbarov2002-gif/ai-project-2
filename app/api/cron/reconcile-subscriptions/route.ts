import { NextResponse } from "next/server";
import { billingEnabled, stripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Every subscription in Stripe is fetched and compared; a few seconds each. */
export const maxDuration = 60;

/** Statuses in which a stored subscription still grants or bills a plan. */
const LIVE = ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"];

/**
 * Nightly reconciliation (Phase 6, vercel.json): the safety net under the
 * webhook. Every subscription Stripe has goes through the same sync the
 * webhook uses; a subscription we still hold as live but Stripe doesn't
 * know is closed. Each run is recorded in `billing_reconciliations` —
 * `fixed` should be 0 night after night; anything else is logged as an
 * error (Sentry), because it means a webhook was missed or mishandled.
 *
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!billingEnabled()) {
    return NextResponse.json({ skipped: "Payments are not set up." });
  }

  const admin = createAdminClient();
  let checked = 0;
  const fixed: string[] = [];
  try {
    const seen = new Set<string>();
    for await (const subscription of stripe().subscriptions.list({ status: "all", limit: 100 })) {
      checked += 1;
      seen.add(subscription.id);
      if ((await syncSubscription(admin, subscription)) === "updated") fixed.push(subscription.id);
    }

    const { data: stored, error } = await admin
      .from("subscriptions")
      .select("provider_ref")
      .not("provider_ref", "is", null)
      .in("status", LIVE);
    if (error) throw new Error(`Stored subscriptions not read: ${error.message}`);
    for (const { provider_ref: ref } of stored ?? []) {
      if (ref && !seen.has(ref)) {
        const { error: closeError } = await admin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("provider_ref", ref);
        if (closeError) throw new Error(`Subscription ${ref} not closed: ${closeError.message}`);
        fixed.push(ref);
      }
    }
  } catch (error) {
    logger.error("billing: reconciliation failed", { error, checked });
    return NextResponse.json({ error: "Reconciliation failed." }, { status: 500 });
  }

  await admin.from("billing_reconciliations").insert({ checked, fixed: fixed.length });
  if (fixed.length > 0) {
    logger.error("billing: reconciliation corrected subscriptions", { fixed: fixed.slice(0, 20) });
  } else {
    logger.info("billing: reconciliation found no differences", { checked });
  }
  return NextResponse.json({ checked, fixed: fixed.length });
}
