import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "./helpers/fakeSupabase";

const createAdminClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const { GET } = await import("@/app/api/cron/purge-expired/route");

const call = (auth?: string) =>
  GET(
    new Request(
      "http://localhost/api/cron/purge-expired",
      auth ? { headers: { authorization: auth } } : {},
    ),
  );

describe("GET /api/cron/purge-expired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T04:45:00Z"));
    process.env.CRON_SECRET = "cron-secret";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a caller without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("deletes expired guest sessions and rate-limit records older than a day", async () => {
    const { client, queries } = fakeSupabase({
      guest_sessions: () => ({ count: 3 }),
      rate_limit_events: () => ({ count: 120 }),
    });
    createAdminClient.mockReturnValue(client);

    const res = await call("Bearer cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ guestSessions: 3, rateLimitEvents: 120 });

    const sessions = queries.find((q) => q.table === "guest_sessions")!;
    expect(sessions.calls).toEqual([
      ["delete", { count: "exact" }],
      ["lt", "expires_at", "2026-10-28T04:45:00.000Z"],
    ]);
    const events = queries.find((q) => q.table === "rate_limit_events")!;
    expect(events.calls).toEqual([
      ["delete", { count: "exact" }],
      ["lt", "created_at", "2026-10-27T04:45:00.000Z"],
    ]);
  });

  it("answers 500 when a delete fails, so the failure is seen", async () => {
    const { client, queries } = fakeSupabase({
      guest_sessions: () => ({ error: { message: "timeout" } }),
      rate_limit_events: () => ({ count: 0 }),
    });
    createAdminClient.mockReturnValue(client);

    expect((await call("Bearer cron-secret")).status).toBe(500);
    // The other delete still ran.
    expect(queries.map((q) => q.table)).toEqual(["guest_sessions", "rate_limit_events"]);
  });
});
