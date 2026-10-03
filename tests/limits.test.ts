import { describe, expect, it, vi } from "vitest";
import { checkUsage } from "@/lib/limits/checkUsage";
import { isOverRateLimit } from "@/lib/limits/rateLimit";
import type { PlanLimits } from "@/lib/generation/plan";
import { fakeSupabase } from "./helpers/fakeSupabase";

const free: PlanLimits = {
  planSlug: "free",
  maxGenerationsPerMonth: 20,
  maxSavedResults: 20,
  allowedToolSlugs: ["ad-generator"],
  allowedAiModels: ["claude"],
  premiumTemplates: false,
};
const period = { start: "2026-09-01", end: "2026-10-01" };

function adminWith(userCount: number, guestCount: number) {
  return fakeSupabase({
    usage_counters: () => ({ data: { generations_count: userCount } }),
    generations: () => ({ count: guestCount }),
  }).client;
}

describe("checkUsage", () => {
  it("refuses a tool outside the plan", async () => {
    const result = await checkUsage({ userId: "u", toolSlug: "content-generator", planLimits: free, period, admin: adminWith(0, 0) });
    expect(result).toMatchObject({ allowed: false, reason: "tool_not_in_plan" });
  });

  it("refuses a premium template on a plan without premium templates", async () => {
    const result = await checkUsage({ userId: "u", toolSlug: "ad-generator", templateIsPremium: true, planLimits: free, period, admin: adminWith(0, 0) });
    expect(result).toMatchObject({ allowed: false, reason: "template_not_in_plan" });
    const pro = { ...free, premiumTemplates: true };
    expect((await checkUsage({ userId: "u", toolSlug: "ad-generator", templateIsPremium: true, planLimits: pro, period, admin: adminWith(0, 0) })).allowed).toBe(true);
  });

  it("counts a user's period and reports what's left after this one", async () => {
    expect(await checkUsage({ userId: "u", toolSlug: "ad-generator", planLimits: free, period, admin: adminWith(5, 0) })).toEqual({ allowed: true, remaining: 14 });
    expect(await checkUsage({ userId: "u", toolSlug: "ad-generator", planLimits: free, period, admin: adminWith(20, 0) })).toMatchObject({ allowed: false, reason: "monthly_limit_reached" });
  });

  it("counts a guest's own generations", async () => {
    const guestPlan = { ...free, maxGenerationsPerMonth: 3 };
    expect((await checkUsage({ guestSessionId: "g", toolSlug: "ad-generator", planLimits: guestPlan, period, admin: adminWith(0, 2) })).allowed).toBe(true);
    expect((await checkUsage({ guestSessionId: "g", toolSlug: "ad-generator", planLimits: guestPlan, period, admin: adminWith(0, 3) })).allowed).toBe(false);
  });

  it("never counts for an unlimited plan", async () => {
    const unlimited = { ...free, maxGenerationsPerMonth: null, allowedToolSlugs: "all" as const };
    expect(await checkUsage({ userId: "u", toolSlug: "anything", planLimits: unlimited, period, admin: adminWith(10_000, 0) })).toEqual({ allowed: true, remaining: "unlimited" });
  });
});

describe("isOverRateLimit", () => {
  it("counts the caller's generations in the last minute", async () => {
    const { client, queries } = fakeSupabase({ generations: () => ({ count: 6 }) });
    const now = new Date("2026-09-26T12:00:00Z");
    expect(await isOverRateLimit({ admin: client, identity: { type: "user", userId: "u1" }, maxPerMinute: 6, now })).toBe(true);
    expect(queries[0]!.calls).toContainEqual(["gte", "created_at", "2026-09-26T11:59:00.000Z"]);
    expect(queries[0]!.calls).toContainEqual(["eq", "user_id", "u1"]);
  });

  it("scopes a guest to their session and allows under the limit", async () => {
    const { client, queries } = fakeSupabase({ generations: () => ({ count: 2 }) });
    expect(await isOverRateLimit({ admin: client, identity: { type: "guest", guestSessionId: "g1", companyProfileDraft: null }, maxPerMinute: 6 })).toBe(false);
    expect(queries[0]!.calls).toContainEqual(["eq", "guest_session_id", "g1"]);
  });

  it("fails open when the count can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeSupabase({ generations: () => ({ error: { message: "boom" } }) });
    expect(await isOverRateLimit({ admin: client, identity: { type: "user", userId: "u1" }, maxPerMinute: 1 })).toBe(false);
  });
});
