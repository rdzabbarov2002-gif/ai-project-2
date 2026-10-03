import { describe, expect, it } from "vitest";
import { resolvePlanLimits } from "@/lib/generation/plan";
import { fakeSupabase } from "./helpers/fakeSupabase";

const freeRow = {
  slug: "free",
  plan_limits: {
    max_generations_per_month: 20,
    max_saved_results: 20,
    allowed_tool_ids: ["ad-generator"],
    allowed_ai_models: ["claude"],
    premium_templates: false,
  },
};

describe("resolvePlanLimits", () => {
  it("reads a user's plan and normalizes its limits", async () => {
    const { client } = fakeSupabase({
      subscriptions: () => ({ data: [{ plans: { slug: "free" } }, { plans: { slug: "pro" } }] }),
      plans: () => ({ data: { ...freeRow, slug: "pro", plan_limits: { ...freeRow.plan_limits, max_generations_per_month: 500, allowed_tool_ids: "all", premium_templates: true } } }),
    });
    expect(await resolvePlanLimits(client, { type: "user", userId: "u" })).toEqual({
      planSlug: "pro",
      maxGenerationsPerMonth: 500,
      maxSavedResults: 20,
      allowedToolSlugs: "all",
      allowedAiModels: ["claude"],
      premiumTemplates: true,
    });
  });

  it("takes the plan from the subscriptions in force, never from anything else", async () => {
    const { client, queries } = fakeSupabase({
      subscriptions: () => ({ data: [{ plans: { slug: "pro" } }, { plans: { slug: "free" } }] }),
      plans: () => ({ data: { ...freeRow, slug: "pro" } }),
    });
    await resolvePlanLimits(client, { type: "user", userId: "u" });
    const subs = queries.find((q) => q.table === "subscriptions")!;
    expect(subs.calls).toContainEqual(["eq", "user_id", "u"]);
    // past_due, unpaid, canceled… don't count: they fall back to Free.
    expect(subs.calls).toContainEqual(["in", "status", ["active", "trialing"]]);
    expect(queries.find((q) => q.table === "plans")!.calls).toContainEqual(["eq", "slug", "pro"]);
  });

  it("is Free when no paid subscription is in force", async () => {
    const { client, queries } = fakeSupabase({
      subscriptions: () => ({ data: [{ plans: { slug: "free" } }] }),
      plans: () => ({ data: freeRow }),
    });
    await resolvePlanLimits(client, { type: "user", userId: "u" });
    expect(queries.find((q) => q.table === "plans")!.calls).toContainEqual(["eq", "slug", "free"]);
  });

  it("caps a guest at the guest allowance (architecture doc §8)", async () => {
    const { client } = fakeSupabase({ plans: () => ({ data: freeRow }) });
    const limits = await resolvePlanLimits(client, { type: "guest" });
    expect(limits.planSlug).toBe("free");
    expect(limits.maxGenerationsPerMonth).toBe(3);
  });

  it("fails closed on a read error or an empty plan_limits embed", async () => {
    for (const result of [{ error: { message: "down" } }, { data: { slug: "free", plan_limits: [] } }]) {
      const { client } = fakeSupabase({ plans: () => result });
      const limits = await resolvePlanLimits(client, { type: "guest" });
      expect(limits.maxGenerationsPerMonth).toBe(0);
      expect(limits.allowedToolSlugs).toEqual([]);
      expect(limits.premiumTemplates).toBe(false);
    }
  });
});
