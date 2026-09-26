import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeResult, type RecordedQuery } from "./helpers/fakeSupabase";

const requireUser = vi.fn();
const createAdminClient = vi.fn();
const track = vi.fn();
vi.mock("@/lib/supabase/auth", () => ({ requireUser }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/analytics", () => ({ track }));

const { sendFeedback } = await import("@/app/(auth)/feedback/actions");

const initial = { error: null, sent: false };

function form(message: string) {
  const data = new FormData();
  data.set("message", message);
  return data;
}

/** The feedback table answers the count (head select) and the insert. */
function feedbackTable(recent: number, insert: FakeResult = {}) {
  return (query: RecordedQuery): FakeResult =>
    query.calls[0]?.[0] === "insert" ? insert : { count: recent };
}

describe("sendFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "user-1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("saves the trimmed message for the signed-in user", async () => {
    const { client, queries } = fakeSupabase({ feedback: feedbackTable(0) });
    createAdminClient.mockReturnValue(client);

    expect(await sendFeedback(initial, form("  The ad tool is great  "))).toEqual({
      error: null,
      sent: true,
    });
    const insert = queries.find((q) => q.calls[0]?.[0] === "insert")!;
    expect(insert.calls[0]).toEqual(["insert", { user_id: "user-1", message: "The ad tool is great" }]);
    expect(track).toHaveBeenCalledWith("feedback_sent", "user-1");
  });

  it.each([
    ["an empty message", "   ", "Write a few words first."],
    ["a message over 2,000 characters", "x".repeat(2001), "Keep it under 2,000 characters."],
  ])("refuses %s without saving", async (_label, message, error) => {
    const { client, queries } = fakeSupabase({ feedback: feedbackTable(0) });
    createAdminClient.mockReturnValue(client);

    expect(await sendFeedback(initial, form(message))).toEqual({ error, sent: false });
    expect(queries).toHaveLength(0);
  });

  it("refuses the 11th message within an hour", async () => {
    const { client, queries } = fakeSupabase({ feedback: feedbackTable(10) });
    createAdminClient.mockReturnValue(client);

    const result = await sendFeedback(initial, form("One more thing"));
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/try again later/);
    expect(queries.some((q) => q.calls[0]?.[0] === "insert")).toBe(false);
    // Counted per user, over the last hour.
    expect(queries[0]!.calls).toContainEqual(["eq", "user_id", "user-1"]);
    expect(queries[0]!.calls.some((call) => call[0] === "gte" && call[1] === "created_at")).toBe(true);
  });

  it("says so when the save fails, without the database's message", async () => {
    const { client } = fakeSupabase({
      feedback: feedbackTable(0, { error: { message: "relation does not exist" } }),
    });
    createAdminClient.mockReturnValue(client);

    expect(await sendFeedback(initial, form("Hello"))).toEqual({
      error: "We couldn't send that. Please try again.",
      sent: false,
    });
    expect(track).not.toHaveBeenCalled();
  });
});
