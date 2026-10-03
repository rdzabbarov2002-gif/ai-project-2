import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type RecordedQuery } from "./helpers/fakeSupabase";

const createAdminClient = vi.hoisted(() => vi.fn());
const plansQuery = vi.hoisted(() => ({ result: { error: null as { message: string } | null }, delay: 0 }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        limit: () => ({
          abortSignal: () => Promise.resolve(plansQuery.result),
        }),
      }),
    }),
  }),
}));

const { GET: health } = await import("@/app/api/health/route");
const { GET: aiSpend } = await import("@/app/api/cron/ai-spend/route");
const { costUsd } = await import("@/lib/ai-spend");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    plansQuery.result = { error: null };
  });

  it("is 200 while the database answers", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", checks: { database: "ok" } });
  });

  it("is 503 when the database doesn't, without saying why", async () => {
    plansQuery.result = { error: { message: "connection refused to db.internal:5432" } };
    const res = await health();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ status: "down", checks: { database: "down" } });
    expect(JSON.stringify(body)).not.toContain("db.internal");
  });
});

describe("GET /api/cron/ai-spend", () => {
  const call = (auth?: string, query = "") =>
    aiSpend(
      new Request(`http://localhost/api/cron/ai-spend${query}`, auth ? { headers: { authorization: auth } } : {}),
    );

  /** The generations table, answering each page from `rows`. */
  function generations(rows: { input_tokens: number | null; output_tokens: number | null }[]) {
    return fakeSupabase({
      generations: (q: RecordedQuery) => {
        const [, from, to] = q.calls.find((call) => call[0] === "range") as [string, number, number];
        return { data: rows.slice(from, to + 1) };
      },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    delete process.env.AI_DAILY_BUDGET_USD;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("refuses a caller without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("prices tokens at Sonnet's $2 / $10 per million", () => {
    expect(costUsd(1_000_000, 0)).toBe(2);
    expect(costUsd(0, 1_000_000)).toBe(10);
    expect(costUsd(3000, 8192)).toBeCloseTo(0.08792);
  });

  it("adds up the last day's generations across pages, within the default $10 budget", async () => {
    const rows: { input_tokens: number | null; output_tokens: number | null }[] = Array.from(
      { length: 1500 },
      () => ({ input_tokens: 1000, output_tokens: 300 }),
    );
    rows.push({ input_tokens: null, output_tokens: null });
    const { client, queries } = generations(rows);
    createAdminClient.mockReturnValue(client);

    const body = await (await call("Bearer cron-secret")).json();
    expect(body).toEqual({
      generations: 1501,
      inputTokens: 1_500_000,
      outputTokens: 450_000,
      costUsd: 7.5,
      budgetUsd: 10,
      over: false,
    });
    expect(queries).toHaveLength(2);
    const since = queries[0]!.calls.find((call) => call[0] === "gte")!;
    expect(since[1]).toBe("created_at");
    expect(Date.now() - new Date(since[2] as string).getTime()).toBeCloseTo(86_400_000, -4);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("raises an error, for the alert, once spend reaches the budget", async () => {
    process.env.AI_DAILY_BUDGET_USD = "5";
    const { client } = generations(Array.from({ length: 1000 }, () => ({ input_tokens: 1000, output_tokens: 400 })));
    createAdminClient.mockReturnValue(client);

    expect(await (await call("Bearer cron-secret")).json()).toMatchObject({ costUsd: 6, budgetUsd: 5, over: true });
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain("ai: daily spend over budget");
  });

  it("fires the alert by hand with ?budget=0, even with no spend", async () => {
    const { client } = generations([]);
    createAdminClient.mockReturnValue(client);
    expect(await (await call("Bearer cron-secret", "?budget=0")).json()).toMatchObject({ costUsd: 0, over: true });
    expect((await call("Bearer cron-secret", "?budget=lots")).status).toBe(400);
  });

  it("answers 500 when the generations can't be read", async () => {
    const { client } = fakeSupabase({ generations: () => ({ error: { message: "down" } }) });
    createAdminClient.mockReturnValue(client);
    expect((await call("Bearer cron-secret")).status).toBe(500);
  });
});
