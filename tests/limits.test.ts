import { describe, expect, it, vi } from "vitest";
import { checkUsage } from "@/lib/limits/checkUsage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ipSubject, isOverRateLimit } from "@/lib/limits/rateLimit";
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
  function adminRpc(result: { data?: boolean | null; error?: { message: string } | null }) {
    const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
    return { admin: { rpc } as unknown as SupabaseClient<Database>, rpc };
  }

  it("takes one request from the subject's limit, in the database", async () => {
    const { admin, rpc } = adminRpc({ data: true });
    expect(await isOverRateLimit(admin, "generate:user:u1", { max: 6, windowSeconds: 60 })).toBe(false);
    expect(rpc).toHaveBeenCalledWith("take_rate_limit", {
      p_subject: "generate:user:u1",
      p_max: 6,
      p_window_seconds: 60,
    });
  });

  it("refuses when the limit has no room left", async () => {
    const { admin } = adminRpc({ data: false });
    expect(await isOverRateLimit(admin, "generate:guest:g1", { max: 6, windowSeconds: 60 })).toBe(true);
  });

  it("fails open when the database can't be asked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = adminRpc({ error: { message: "boom" } });
    expect(await isOverRateLimit(admin, "generate:user:u1", { max: 1, windowSeconds: 60 })).toBe(false);
  });
});

describe("ipSubject", () => {
  const day = new Date("2026-10-28T12:00:00Z");

  it("never contains the address, and is the same all day", () => {
    const subject = ipSubject("generate", "203.0.113.7", day);
    expect(subject).toMatch(/^generate:ip:[0-9a-f]{32}$/);
    expect(subject).not.toContain("203.0.113.7");
    expect(ipSubject("generate", "203.0.113.7", new Date("2026-10-28T23:59:59Z"))).toBe(subject);
  });

  it("counts an IPv6 /64 as one subscriber, written any way", () => {
    const subject = ipSubject("generate", "2001:db8:abcd:12::1", day);
    for (const same of ["2001:db8:abcd:12:ffff:ffff:ffff:ffff", "2001:0db8:abcd:0012:0:0:0:2", "2001:DB8:ABCD:12::a:b"]) {
      expect(ipSubject("generate", same, day), same).toBe(subject);
    }
    expect(ipSubject("generate", "2001:db8:abcd:13::1", day)).not.toBe(subject);
    expect(ipSubject("generate", "::ffff:203.0.113.7", day)).toBe(ipSubject("generate", "203.0.113.7", day));
  });

  it("differs by address, by day and by what is limited", () => {
    const subject = ipSubject("generate", "203.0.113.7", day);
    expect(ipSubject("generate", "203.0.113.8", day)).not.toBe(subject);
    expect(ipSubject("generate", "203.0.113.7", new Date("2026-10-29T00:00:00Z"))).not.toBe(subject);
    expect(ipSubject("draft", "203.0.113.7", day)).toMatch(/^draft:ip:/);
  });
});
