import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type RecordedQuery } from "./helpers/fakeSupabase";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  admin: null as unknown,
  userClient: null as unknown,
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    Object.assign(state.userClient ?? {}, {
      auth: { getUser: async () => ({ data: { user: state.user } }) },
    }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => Object.assign(state.admin as object, { rpc: state.rpc }),
}));

const merge = (await import("@/app/api/session/merge/route")).POST;
const draft = (await import("@/app/api/session/draft/route")).POST;

const post = (handler: (r: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify(body),
    }),
  );

const first = (q: RecordedQuery) => q.calls[0]?.[0];

describe("POST /api/session/merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a token outside the bounds every route accepts", async () => {
    state.admin = fakeSupabase({}).client;
    for (const token of [undefined, 42, "short", "x".repeat(201)]) {
      expect((await post(merge, { guestSessionToken: token })).status).toBe(400);
    }
  });

  it("moves the guest's generations to the account, then deletes the guest session", async () => {
    const { client, queries } = fakeSupabase({
      guest_sessions: (q) =>
        first(q) === "select"
          ? { data: { id: "guest-1", company_profile_draft: null } }
          : {},
      generations: () => ({ data: [{ id: "g1" }, { id: "g2" }] }),
    });
    state.admin = client;

    const res = await post(merge, { guestSessionToken: "guest-token-123" });
    expect(await res.json()).toEqual({
      status: "merged",
      generationsMerged: 2,
      companyProfileCreated: false,
    });

    const moved = queries.find((q) => q.table === "generations")!;
    expect(moved.calls).toContainEqual([
      "update",
      { user_id: "user-1", guest_session_id: null },
    ]);
    expect(moved.calls).toContainEqual(["eq", "guest_session_id", "guest-1"]);
    const deleted = queries.find(
      (q) => q.table === "guest_sessions" && first(q) === "delete",
    )!;
    expect(deleted.calls).toContainEqual(["eq", "id", "guest-1"]);
  });

  it("keeps the guest session when moving its generations fails, for a retry", async () => {
    const { client, queries } = fakeSupabase({
      guest_sessions: () => ({ data: { id: "guest-1", company_profile_draft: null } }),
      generations: () => ({ error: { message: "timeout" } }),
    });
    state.admin = client;

    expect((await post(merge, { guestSessionToken: "guest-token-123" })).status).toBe(
      500,
    );
    expect(
      queries.some((q) => q.table === "guest_sessions" && first(q) === "delete"),
    ).toBe(false);
  });
});

describe("POST /api/session/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the draft while the IP address is under its limit", async () => {
    const { client, queries } = fakeSupabase({ guest_sessions: () => ({}) });
    state.admin = client;
    state.rpc.mockResolvedValue({ data: true, error: null });

    const res = await post(draft, {
      guestSessionToken: "guest-token-123",
      draft: { name: "Acme" },
    });
    expect(res.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith(
      "take_rate_limit",
      expect.objectContaining({
        p_subject: expect.stringMatching(/^draft:ip:[0-9a-f]{32}$/),
      }),
    );
    expect(queries[0]!.calls[0]).toEqual([
      "upsert",
      expect.objectContaining({
        session_token: "guest-token-123",
        company_profile_draft: { name: "Acme" },
      }),
      { onConflict: "session_token" },
    ]);
  });

  it("refuses past the limit without writing anything", async () => {
    const { client, queries } = fakeSupabase({ guest_sessions: () => ({}) });
    state.admin = client;
    state.rpc.mockResolvedValue({ data: false, error: null });

    const res = await post(draft, {
      guestSessionToken: "guest-token-123",
      draft: { name: "Acme" },
    });
    expect(res.status).toBe(429);
    expect(queries).toHaveLength(0);
  });
});
