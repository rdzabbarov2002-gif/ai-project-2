import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type RecordedQuery } from "./helpers/fakeSupabase";

const state = vi.hoisted(() => ({
  enabled: true,
  subscriptions: [] as { id: string }[],
  sync: vi.fn(),
}));
const createAdminClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/stripe", () => ({
  billingEnabled: () => state.enabled,
  stripe: () => ({
    subscriptions: {
      list: () =>
        (async function* () {
          yield* state.subscriptions;
        })(),
    },
  }),
}));
vi.mock("@/lib/billing/sync", () => ({ syncSubscription: state.sync }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const { GET } = await import("@/app/api/cron/reconcile-subscriptions/route");

const call = (auth?: string) =>
  GET(new Request("http://localhost/api/cron/reconcile-subscriptions", auth ? { headers: { authorization: auth } } : {}));

const first = (q: RecordedQuery) => q.calls[0]?.[0];

/** Our database: the live subscriptions it holds. */
function database(live: string[] = []) {
  return fakeSupabase({
    subscriptions: (q) => (first(q) === "update" ? {} : { data: live.map((ref) => ({ provider_ref: ref })) }),
    billing_reconciliations: () => ({}),
  });
}

describe("GET /api/cron/reconcile-subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enabled = true;
    state.subscriptions = [];
    process.env.CRON_SECRET = "cron-secret";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("refuses a caller without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("finds no differences when every subscription is already stored as Stripe has it", async () => {
    const { client, queries } = database(["sub_1", "sub_2"]);
    createAdminClient.mockReturnValue(client);
    state.subscriptions = [{ id: "sub_1" }, { id: "sub_2" }];
    state.sync.mockResolvedValue("unchanged");

    const res = await call("Bearer cron-secret");
    expect(await res.json()).toEqual({ checked: 2, fixed: 0 });
    const run = queries.find((q) => q.table === "billing_reconciliations")!;
    expect(run.calls[0]).toEqual(["insert", { checked: 2, fixed: 0 }]);
  });

  it("counts what the sync had to correct", async () => {
    const { client } = database(["sub_1"]);
    createAdminClient.mockReturnValue(client);
    state.subscriptions = [{ id: "sub_1" }, { id: "sub_2" }];
    state.sync.mockResolvedValueOnce("updated").mockResolvedValueOnce("unchanged");

    expect(await (await call("Bearer cron-secret")).json()).toEqual({ checked: 2, fixed: 1 });
  });

  it("closes a stored live subscription that Stripe doesn't have", async () => {
    const { client, queries } = database(["sub_gone"]);
    createAdminClient.mockReturnValue(client);
    state.subscriptions = [];

    expect(await (await call("Bearer cron-secret")).json()).toEqual({ checked: 0, fixed: 1 });
    const close = queries.find((q) => q.table === "subscriptions" && first(q) === "update")!;
    expect(close.calls).toEqual([
      ["update", { status: "canceled" }],
      ["eq", "provider_ref", "sub_gone"],
    ]);
  });

  it("answers 500 and records no run when it can't finish", async () => {
    const { client, queries } = database();
    createAdminClient.mockReturnValue(client);
    state.subscriptions = [{ id: "sub_1" }];
    state.sync.mockRejectedValue(new Error("database down"));

    expect((await call("Bearer cron-secret")).status).toBe(500);
    expect(queries.some((q) => q.table === "billing_reconciliations")).toBe(false);
  });

  it("does nothing while payments aren't set up", async () => {
    state.enabled = false;
    expect(await (await call("Bearer cron-secret")).json()).toEqual({ skipped: "Payments are not set up." });
  });
});
