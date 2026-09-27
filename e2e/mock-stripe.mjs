// Stand-in for Stripe in the end-to-end tests: the app talks to it through
// STRIPE_API_BASE (playwright.config.ts). It keeps customers and
// subscriptions in memory, plays Checkout (visiting the session's URL
// "pays" and returns to the app) and sends the app signed webhook events,
// as Stripe does. Tests move a subscription through its lifecycle with the
// /__control/ endpoints. Only what the app calls is implemented.
import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const PORT = 4011;
const BASE = `http://127.0.0.1:${PORT}`;
const WEBHOOK_URL = process.env.APP_WEBHOOK_URL ?? "http://localhost:3000/api/stripe/webhook";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e_local";
const DAY = 86_400;

const prices = {
  pro_monthly: { id: "price_pro_monthly", object: "price", lookup_key: "pro_monthly", active: true, unit_amount: 2900 },
  enterprise_monthly: { id: "price_enterprise_monthly", object: "price", lookup_key: "enterprise_monthly", active: true, unit_amount: 9900 },
};
const customers = new Map();
const sessions = new Map();
const subscriptions = new Map();
const sent = []; // every event sent, for replays
const webhookEndpoints = []; // scripts/stripe-setup.mjs registers one
let counter = 0;
const nextId = (prefix) => `${prefix}_${Date.now().toString(36)}${(++counter).toString(36)}`;
const now = () => Math.floor(Date.now() / 1000);

/** Stripe's form encoding (`a[b][0][c]=1`) into nested objects. */
function parseForm(text) {
  const out = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const path = key.replace(/\]/g, "").split("[");
    let node = out;
    path.forEach((part, index) => {
      if (index === path.length - 1) node[part] = value;
      else node = node[part] ??= {};
    });
  }
  return out;
}

/** Sends one event to the app, signed like Stripe's; the app's status. */
async function send(type, object, id = nextId("evt")) {
  const event = { id, object: "event", type, created: now(), data: { object: structuredClone(object) } };
  sent.push(event);
  const payload = JSON.stringify(event);
  const t = now();
  const v1 = createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` },
    body: payload,
  });
  return res.status;
}

function subscriptionFor(session) {
  const trialDays = Number(session.subscription_data?.trial_period_days ?? 0);
  const price = Object.values(prices).find((p) => p.id === session.line_items["0"].price);
  const start = now();
  return {
    id: nextId("sub"),
    object: "subscription",
    customer: session.customer,
    status: trialDays ? "trialing" : "active",
    metadata: session.subscription_data?.metadata ?? {},
    trial_end: trialDays ? start + trialDays * DAY : null,
    cancel_at_period_end: false,
    cancel_at: null,
    items: {
      object: "list",
      data: [{ id: nextId("si"), price, current_period_end: start + (trialDays || 30) * DAY }],
    },
  };
}

async function control(path, body) {
  const [, , kind, id] = path.split("/"); // /__control/<kind>/<id>
  if (kind === "state") return { subscriptions: [...subscriptions.values()], customers: [...customers.values()] };
  if (kind === "replay") {
    const event = sent.at(-1);
    return { status: await send(event.type, event.data.object, event.id), event: event.id };
  }
  const sub = subscriptions.get(id);
  if (!sub) return { error: "no such subscription" };
  if (kind === "stale") {
    // An old copy of the subscription arriving late, as a new event.
    return { status: await send("customer.subscription.updated", { ...sub, ...body }) };
  }
  if (kind === "update") {
    if (body.price) sub.items.data[0].price = prices[body.price];
    for (const key of ["status", "cancel_at_period_end", "trial_end"]) {
      if (key in body) sub[key] = body[key];
    }
    if (body.status === "active" && sub.trial_end && sub.trial_end > now()) sub.trial_end = now();
    const type = sub.status === "canceled" ? "customer.subscription.deleted" : "customer.subscription.updated";
    if (body.invoice) {
      const paid = body.invoice === "paid";
      const invoice = {
        id: nextId("in"),
        object: "invoice",
        customer: sub.customer,
        amount_paid: paid ? sub.items.data[0].price.unit_amount : 0,
        currency: "usd",
        billing_reason: "subscription_cycle",
        parent: { subscription_details: { subscription: sub.id } },
      };
      await send(body.invoice === "failed" ? "invoice.payment_failed" : "invoice.paid", invoice);
    }
    if (body.refund) await send("charge.refunded", { id: nextId("ch"), object: "charge", customer: sub.customer });
    return { status: await send(type, sub) };
  }
  return { error: "unknown control" };
}

async function handle(req, url, body) {
  const path = url.pathname;
  const json = (status, value) => ({ status, value });
  const notFound = () => json(404, { error: { type: "invalid_request_error", message: `No such route: ${path}` } });

  if (path === "/health") return json(200, { ok: true });
  if (path.startsWith("/__control/")) return json(200, await control(path, body ? JSON.parse(body) : {}));

  if (req.method === "POST" && path === "/v1/customers") {
    const params = parseForm(body);
    const customer = { id: nextId("cus"), object: "customer", email: params.email, metadata: params.metadata ?? {} };
    customers.set(customer.id, customer);
    return json(200, customer);
  }
  let match = path.match(/^\/v1\/customers\/([^/]+)$/);
  if (req.method === "DELETE" && match) {
    customers.delete(match[1]);
    for (const sub of subscriptions.values()) {
      if (sub.customer === match[1] && sub.status !== "canceled") {
        sub.status = "canceled";
        await send("customer.subscription.deleted", sub);
      }
    }
    return json(200, { id: match[1], object: "customer", deleted: true });
  }
  if (req.method === "GET" && path === "/v1/prices") {
    const keys = Object.values(parseForm(url.search.slice(1)).lookup_keys ?? {});
    return json(200, { object: "list", data: keys.map((key) => prices[key]).filter(Boolean), has_more: false });
  }
  if (req.method === "POST" && path === "/v1/checkout/sessions") {
    const params = parseForm(body);
    const session = { id: nextId("cs"), object: "checkout.session", ...params, url: "" };
    session.url = `${BASE}/checkout/${session.id}`;
    sessions.set(session.id, session);
    return json(200, session);
  }
  match = path.match(/^\/checkout\/([^/]+)$/);
  if (req.method === "GET" && match) {
    // The customer "pays": the subscription starts, then back to the app.
    const session = sessions.get(match[1]);
    const sub = subscriptionFor(session);
    subscriptions.set(sub.id, sub);
    await send("checkout.session.completed", { ...session, mode: "subscription", subscription: sub.id });
    await send("customer.subscription.created", sub);
    return { status: 303, redirect: session.success_url };
  }
  if (req.method === "POST" && path === "/v1/billing_portal/sessions") {
    const params = parseForm(body);
    return json(200, { id: nextId("bps"), object: "billing_portal.session", url: params.return_url });
  }
  if (path === "/v1/webhook_endpoints") {
    if (req.method === "POST") {
      const params = parseForm(body);
      const endpoint = { id: nextId("we"), object: "webhook_endpoint", url: params.url, secret: SECRET,
        enabled_events: Object.values(params.enabled_events ?? {}) };
      webhookEndpoints.push(endpoint);
      return json(200, endpoint);
    }
    return json(200, { object: "list", data: webhookEndpoints.map(({ secret, ...rest }) => rest), has_more: false });
  }
  if (req.method === "GET" && path === "/v1/subscriptions") {
    return json(200, { object: "list", data: [...subscriptions.values()], has_more: false, url: "/v1/subscriptions" });
  }
  match = path.match(/^\/v1\/subscriptions\/([^/]+)$/);
  if (req.method === "GET" && match) {
    const sub = subscriptions.get(match[1]);
    return sub ? json(200, sub) : notFound();
  }
  return notFound();
}

createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const result = await handle(req, new URL(req.url, BASE), body);
      if (result.redirect) {
        res.writeHead(result.status, { location: result.redirect }).end();
      } else {
        res.writeHead(result.status, { "content-type": "application/json" }).end(JSON.stringify(result.value));
      }
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: String(error) }));
    }
  });
}).listen(PORT, "127.0.0.1");
