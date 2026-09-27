// Sets up what the app expects to find in a Stripe account — the same
// steps for test mode and live mode (docs/billing.md). Safe to run again:
// it only creates what's missing.
//
//   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-setup.mjs
//   STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-setup.mjs --webhook https://<domain>/api/stripe/webhook
//
// Creates the Pro product and its monthly price (lookup key `pro_monthly`,
// which the app maps to the Pro plan), and with --webhook the webhook
// endpoint with the events the app handles, printing its signing secret.
import Stripe from "stripe";

// Must match plans.price_month (migration 0010) and CHECKOUT_PRICE in
// lib/billing/stripe.ts.
const PRICES = [{ plan: "pro", name: "Pro", lookupKey: "pro_monthly", amount: 2900 }];

// Must match the events app/api/stripe/webhook/route.ts handles
// (tests/stripe-setup.test.ts checks).
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
];

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY (a test key first: sk_test_…).");
  process.exit(1);
}
const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
const stripe = new Stripe(key, {
  ...(base && { host: base.hostname, port: Number(base.port), protocol: base.protocol.replace(":", "") }),
});
const mode = key.startsWith("sk_live_") ? "LIVE" : "test";
console.log(`Stripe ${mode} mode`);

for (const { plan, name, lookupKey, amount } of PRICES) {
  const [existing] = (await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })).data;
  if (existing) {
    const note = existing.unit_amount === amount ? "" : ` — but it is ${existing.unit_amount} cents, not ${amount}`;
    console.log(`✓ price ${lookupKey} exists (${existing.id})${note}`);
    continue;
  }
  const product = await stripe.products.create({ name, metadata: { plan } });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amount,
    recurring: { interval: "month" },
    lookup_key: lookupKey,
    // Tax is added on top, per the customer's address (Stripe Tax).
    tax_behavior: "exclusive",
  });
  console.log(`+ created ${name}: price ${lookupKey} (${price.id})`);
}

const webhookIndex = process.argv.indexOf("--webhook");
if (webhookIndex > 0) {
  const url = process.argv[webhookIndex + 1];
  if (!url?.startsWith("https://")) {
    console.error("--webhook needs the https:// URL of /api/stripe/webhook.");
    process.exit(1);
  }
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (endpoints.data.some((endpoint) => endpoint.url === url)) {
    console.log(`✓ webhook endpoint ${url} exists (its signing secret is in the Dashboard)`);
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS });
    console.log(`+ created webhook endpoint ${url}`);
    console.log(`  STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
  }
}

console.log(`
Then, in the Stripe Dashboard (${mode} mode) — docs/billing.md, "Setting up":
  • Tax: activate Stripe Tax (origin address, where you're registered).
  • Settings → Billing → Customer portal: turn on cancel at period end,
    payment method update and invoice history; save.
  • Settings → Billing → Subscriptions and emails: Smart Retries on, emails
    for failed payments and ending trials on.`);
