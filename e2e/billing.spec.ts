import { expect, test, type Page } from "@playwright/test";
import { adminSelect, adminUpdate, createUser, signIn, uniqueEmail } from "./helpers";

/**
 * Payments, end to end, against the Stripe stand-in (e2e/mock-stripe.mjs):
 * the Phase 6 scenarios — subscribe with a trial, trial → payment, trial →
 * cancel, plan up and down, a declined card (past due → Free), cancel at
 * the end of the period, a refund — plus the webhook's defences, the
 * nightly reconciliation and account deletion. Every change reaches the
 * app the way Stripe's would: as a signed webhook event, after which the
 * app reads the subscription back from "Stripe".
 */

const STRIPE = "http://127.0.0.1:4011";

async function control(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${STRIPE}/__control/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { status?: number; subscriptions?: { id: string; status: string }[] };
}

/** Moves the subscription in "Stripe"; the app hears it by webhook. */
async function stripeChanges(subscription: string, change: Record<string, unknown>) {
  const { status } = await control(`update/${subscription}`, change);
  expect(status, "the app accepted the webhook").toBe(200);
}

/** A new account that has just subscribed to Pro through Checkout. */
async function subscribe(page: Page, label: string) {
  const email = uniqueEmail(label);
  const userId = await createUser(email, "e2e-password-1");
  await page.goto("/login?next=/settings/billing");
  await signIn(page, email, "e2e-password-1");
  await expect(page).toHaveURL(/\/settings\/billing$/);

  await page.getByRole("button", { name: "Start 14-day free trial" }).click();
  await expect(page).toHaveURL(/\/settings\/billing\?checkout=success$/);
  await expect(page.getByText("your subscription is starting")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan: Pro" })).toBeVisible();

  const [row] = await adminSelect<{ provider_ref: string; status: string }>(
    "subscriptions",
    `user_id=eq.${userId}&provider_ref=not.is.null&select=provider_ref,status`,
  );
  expect(row!.status).toBe("trialing");
  return { userId, subscription: row!.provider_ref };
}

async function expectPlan(page: Page, plan: string) {
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: `Plan: ${plan}` })).toBeVisible();
}

test("subscribe with a free trial; the trial turns into a payment", async ({ page }) => {
  const { subscription } = await subscribe(page, "trial-pay");
  await expect(page.getByText("Pro free trial until")).toBeVisible();
  // Someone who pays manages it in the portal — no second checkout.
  await expect(page.getByRole("button", { name: /free trial|Upgrade to/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage billing" }).first()).toBeVisible();

  await stripeChanges(subscription, { status: "active", invoice: "paid" });
  await expectPlan(page, "Pro");
  await expect(page.getByText("Pro, renews on")).toBeVisible();
});

test("a trial cancelled before it ends isn't charged and leaves Free", async ({ page }) => {
  const { subscription } = await subscribe(page, "trial-cancel");

  await stripeChanges(subscription, { cancel_at_period_end: true });
  await expectPlan(page, "Pro");
  await expect(page.getByText("It ends then — you won't be charged.")).toBeVisible();

  await stripeChanges(subscription, { status: "canceled" });
  await expectPlan(page, "Free");
  await expect(page.getByText("Your Pro subscription has ended.")).toBeVisible();
  // One trial per person.
  await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
});

test("changing plan up and down changes what the account gets", async ({ page }) => {
  const { subscription } = await subscribe(page, "plan-change");
  await stripeChanges(subscription, { status: "active" });

  await stripeChanges(subscription, { price: "enterprise_monthly" });
  await expectPlan(page, "Enterprise");
  await expect(page.getByText("Unlimited").first()).toBeVisible();

  await stripeChanges(subscription, { price: "pro_monthly" });
  await expectPlan(page, "Pro");
});

test("a declined card: past due limits the account to Free until it's paid", async ({ page }) => {
  const { subscription } = await subscribe(page, "past-due");
  await stripeChanges(subscription, { status: "active", invoice: "paid" });

  await stripeChanges(subscription, { status: "past_due", invoice: "failed" });
  await expectPlan(page, "Free");
  await expect(page.getByText("Your last payment for Pro failed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update payment method" })).toBeVisible();
  await page.goto("/tools/content-generator?template=seo-article");
  await expect(page.getByText("is part of the Pro plan")).toBeVisible();

  await stripeChanges(subscription, { status: "active", invoice: "paid" });
  await expectPlan(page, "Pro");
  await page.goto("/tools/content-generator?template=seo-article");
  await expect(page.getByRole("button", { name: /Generate with/ })).toBeVisible();
});

test("cancelled at the end of the period, then refunded", async ({ page }) => {
  const { subscription } = await subscribe(page, "period-end");
  await stripeChanges(subscription, { status: "active", invoice: "paid" });

  await stripeChanges(subscription, { cancel_at_period_end: true });
  await expectPlan(page, "Pro");
  await expect(page.getByText("It won't renew.")).toBeVisible();

  await stripeChanges(subscription, { status: "canceled", refund: true });
  await expectPlan(page, "Free");
});

test("the webhook refuses a bad signature and ignores replayed and late events", async ({ page }) => {
  const forged = await page.request.post("/api/stripe/webhook", {
    headers: { "stripe-signature": "t=1,v1=forged" },
    data: { id: "evt_forged", type: "customer.subscription.updated", data: { object: { id: "sub_x" } } },
  });
  expect(forged.status()).toBe(400);

  const { userId, subscription } = await subscribe(page, "webhook");
  await stripeChanges(subscription, { status: "active", invoice: "paid" });
  const stored = () =>
    adminSelect<{ status: string; updated_at: string }>(
      "subscriptions",
      `user_id=eq.${userId}&provider_ref=not.is.null&select=status,updated_at`,
    );
  const before = await stored();

  // The same event again: acknowledged, nothing written.
  expect((await control("replay")).status).toBe(200);
  // An old copy of the subscription arriving late: Stripe's current state wins.
  expect((await control(`stale/${subscription}`, { status: "trialing" })).status).toBe(200);

  expect(await stored()).toEqual(before);
});

test("the nightly reconciliation finds no differences, and repairs one", async ({ page }) => {
  const reconcile = (auth = "Bearer cron_e2e") =>
    page.request.get("/api/cron/reconcile-subscriptions", { headers: { authorization: auth } });
  expect((await reconcile("Bearer wrong")).status()).toBe(401);

  const { userId, subscription } = await subscribe(page, "reconcile");
  await stripeChanges(subscription, { status: "active", invoice: "paid" });

  // A row that drifted from Stripe (say, a lost webhook) is put back.
  await adminUpdate("subscriptions", `provider_ref=eq.${subscription}`, { status: "canceled" });
  const repaired = await (await reconcile()).json();
  expect(repaired.fixed).toBeGreaterThanOrEqual(1);
  const [row] = await adminSelect<{ status: string }>(
    "subscriptions",
    `user_id=eq.${userId}&provider_ref=eq.${subscription}&select=status`,
  );
  expect(row!.status).toBe("active");

  // Then three runs in a row without a difference.
  for (let night = 0; night < 3; night++) {
    expect((await (await reconcile()).json()).fixed).toBe(0);
  }
});

test("deleting the account ends its subscription in Stripe", async ({ page }) => {
  const { subscription } = await subscribe(page, "delete-paying");
  await stripeChanges(subscription, { status: "active", invoice: "paid" });

  await page.goto("/settings/billing");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/$/);

  const { subscriptions } = await control("state");
  expect(subscriptions!.find((sub) => sub.id === subscription)!.status).toBe("canceled");
});
