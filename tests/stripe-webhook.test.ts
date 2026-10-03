import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { fakeSupabase, type FakeResult, type RecordedQuery } from "./helpers/fakeSupabase";

const state = vi.hoisted(() => ({ enabled: true, retrieve: vi.fn() }));
const createAdminClient = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/stripe", async (importOriginal) => {
  const { default: StripeClient } = await import("stripe");
  const real = new StripeClient("sk_test_unit");
  return {
    ...(await importOriginal<typeof import("@/lib/billing/stripe")>()),
    billingEnabled: () => state.enabled,
    stripe: () => ({ webhooks: real.webhooks, subscriptions: { retrieve: state.retrieve } }),
  };
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/analytics", () => ({ track }));

const { POST } = await import("@/app/api/stripe/webhook/route");

const SECRET = "whsec_unit_test";
const signer = new Stripe("sk_test_unit").webhooks;

function webhook(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  return POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signer.generateTestHeaderString({ payload, secret }) },
      body: payload,
    }),
  );
}

/** A subscription as the Stripe API returns it. */
function subscription(status: string, extra: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status,
    metadata: {},
    trial_end: null,
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_end: 1_790_000_000, price: { id: "price_1", lookup_key: "pro_monthly" } }] },
    ...extra,
  };
}

const updated = (payloadStatus = "active") => ({
  id: "evt_1",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", status: payloadStatus } },
});

const first = (q: RecordedQuery) => q.calls[0]?.[0];

/** The database: whether the event was seen, and the stored subscription. */
function database({ seen = false, stored = null as FakeResult["data"] } = {}) {
  return fakeSupabase({
    stripe_events: (q) => (first(q) === "insert" ? {} : { data: seen ? { id: "evt_1" } : null }),
    billing_customers: () => ({ data: { user_id: "user-1" } }),
    users: () => ({ data: { id: "user-1" } }),
    plans: () => ({ data: { id: "plan-pro" } }),
    subscriptions: (q) => (first(q) === "upsert" ? {} : { data: stored }),
  });
}

const writes = (queries: RecordedQuery[], table: string, method: string) =>
  queries.filter((q) => q.table === table && first(q) === method);

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enabled = true;
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("answers 400 to a wrong signature and touches nothing", async () => {
    const res = await webhook(updated(), "whsec_someone_else");
    expect(res.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(state.retrieve).not.toHaveBeenCalled();
  });

  it("answers 400 without a signature at all", async () => {
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: JSON.stringify(updated()) }),
    );
    expect(res.status).toBe(400);
  });

  it("stores the subscription as Stripe has it now, not the event's copy", async () => {
    // The event still says "active" (it was sent before the payment failed);
    // Stripe now says past_due, and past_due is what gets stored.
    const { client, queries } = database();
    createAdminClient.mockReturnValue(client);
    state.retrieve.mockResolvedValue(subscription("past_due"));

    const res = await webhook(updated("active"));
    expect(res.status).toBe(200);
    expect(state.retrieve).toHaveBeenCalledWith("sub_1");
    const [upsert] = writes(queries, "subscriptions", "upsert");
    expect(upsert!.calls[0]).toEqual([
      "upsert",
      {
        user_id: "user-1",
        plan_id: "plan-pro",
        status: "past_due",
        provider_ref: "sub_1",
        period_end: new Date(1_790_000_000 * 1000).toISOString(),
        trial_end: null,
        cancel_at_period_end: false,
      },
      { onConflict: "provider_ref" },
    ]);
    expect(writes(queries, "stripe_events", "insert")[0]!.calls[0]).toEqual([
      "insert",
      { id: "evt_1", type: "customer.subscription.updated" },
    ]);
  });

  it("acknowledges a redelivered event without applying it again", async () => {
    const { client, queries } = database({ seen: true });
    createAdminClient.mockReturnValue(client);

    const res = await webhook(updated());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(state.retrieve).not.toHaveBeenCalled();
    expect(writes(queries, "subscriptions", "upsert")).toHaveLength(0);
    expect(writes(queries, "stripe_events", "insert")).toHaveLength(0);
  });

  it("answers 500 and records nothing when it fails, so Stripe retries", async () => {
    const { client, queries } = database();
    createAdminClient.mockReturnValue(client);
    state.retrieve.mockRejectedValue(new Error("Stripe unreachable"));

    const res = await webhook(updated());
    expect(res.status).toBe(500);
    expect(writes(queries, "stripe_events", "insert")).toHaveLength(0);
  });

  it("leaves an already up-to-date row alone", async () => {
    const { client, queries } = database({
      stored: {
        user_id: "user-1",
        plan_id: "plan-pro",
        status: "active",
        period_end: "2026-09-21T14:13:20+00:00",
        trial_end: null,
        cancel_at_period_end: false,
      },
    });
    createAdminClient.mockReturnValue(client);
    state.retrieve.mockResolvedValue(subscription("active"));

    expect((await webhook(updated())).status).toBe(200);
    expect(writes(queries, "subscriptions", "upsert")).toHaveLength(0);
  });

  it("finds the subscription behind an invoice", async () => {
    const { client } = database();
    createAdminClient.mockReturnValue(client);
    state.retrieve.mockResolvedValue(subscription("past_due"));

    await webhook({
      id: "evt_2",
      type: "invoice.payment_failed",
      data: { object: { id: "in_1", parent: { subscription_details: { subscription: "sub_1" } } } },
    });
    expect(state.retrieve).toHaveBeenCalledWith("sub_1");
  });

  it("acknowledges and records events it has no use for", async () => {
    const { client, queries } = database();
    createAdminClient.mockReturnValue(client);

    const res = await webhook({ id: "evt_3", type: "customer.created", data: { object: { id: "cus_1" } } });
    expect(res.status).toBe(200);
    expect(state.retrieve).not.toHaveBeenCalled();
    expect(writes(queries, "stripe_events", "insert")).toHaveLength(1);
  });

  it("skips a subscription to a price that isn't a plan", async () => {
    const { client, queries } = database();
    createAdminClient.mockReturnValue(client);
    state.retrieve.mockResolvedValue(
      subscription("active", {
        items: { data: [{ current_period_end: 1, price: { id: "price_x", lookup_key: "donation" } }] },
      }),
    );

    expect((await webhook(updated())).status).toBe(200);
    expect(writes(queries, "subscriptions", "upsert")).toHaveLength(0);
  });

  it("refuses every request while payments aren't set up", async () => {
    state.enabled = false;
    expect((await webhook(updated())).status).toBe(404);
  });

  describe("funnel events", () => {
    it("reports a completed Checkout as subscription_started, with the plan and whether it's a trial", async () => {
      const { client } = database();
      createAdminClient.mockReturnValue(client);
      state.retrieve.mockResolvedValue(subscription("trialing"));

      await webhook({
        id: "evt_c",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", mode: "subscription", subscription: "sub_1", client_reference_id: "user-1" } },
      });
      expect(track).toHaveBeenCalledWith("subscription_started", "user-1", { plan: "pro", trial: true });
    });

    it("reports an invoice that took money as payment_succeeded, for the customer's account", async () => {
      const { client, queries } = database();
      createAdminClient.mockReturnValue(client);
      state.retrieve.mockResolvedValue(subscription("active"));
      const invoice = (amount: number) => ({
        id: "evt_i" + amount,
        type: "invoice.paid",
        data: {
          object: {
            id: "in_1",
            customer: "cus_1",
            amount_paid: amount,
            currency: "usd",
            billing_reason: "subscription_cycle",
            parent: { subscription_details: { subscription: "sub_1" } },
          },
        },
      });

      await webhook(invoice(2900));
      expect(track).toHaveBeenCalledWith("payment_succeeded", "user-1", {
        amount: 29,
        currency: "usd",
        reason: "subscription_cycle",
      });
      const lookup = queries.find((q) => q.table === "billing_customers" && q.calls.some((c) => c[1] === "stripe_customer_id"));
      expect(lookup?.calls).toContainEqual(["eq", "stripe_customer_id", "cus_1"]);

      track.mockClear();
      await webhook(invoice(0)); // a trial's $0 invoice
      expect(track).not.toHaveBeenCalled();
    });

    it("sends nothing for other events, or when the event fails", async () => {
      const { client } = database();
      createAdminClient.mockReturnValue(client);
      state.retrieve.mockResolvedValue(subscription("active"));
      await webhook(updated());
      state.retrieve.mockRejectedValue(new Error("stripe down"));
      await webhook({
        id: "evt_c2",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", mode: "subscription", subscription: "sub_1", client_reference_id: "user-1" } },
      });
      expect(track).not.toHaveBeenCalled();
    });
  });
});
