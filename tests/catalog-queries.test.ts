import { describe, expect, it } from "vitest";
import { queryTools, deriveCategories as toolCategories } from "@/lib/tools/query";
import { queryTemplates, deriveCategories as templateCategories } from "@/lib/templates/query";
import { currentMonthPeriod } from "@/lib/generation/period";
import { firstEmbed } from "@/lib/supabase/embed";
import { GenerateRequestSchema } from "@/lib/generation/validate";

const tools = [
  { slug: "b", name: "Beta", description: "writes emails", icon: null, category: "Email" },
  { slug: "a", name: "Alpha", description: "makes ads", icon: null, category: "Ads" },
  { slug: "c", name: "Gamma", description: null, icon: null, category: null },
];

describe("gallery queries", () => {
  it("search, filter and sort tools; categories come from the data", () => {
    expect(queryTools(tools, {}).map((t) => t.slug)).toEqual(["a", "b", "c"]);
    expect(queryTools(tools, { search: "EMAIL" }).map((t) => t.slug)).toEqual(["b"]);
    expect(queryTools(tools, { category: "Ads" }).map((t) => t.slug)).toEqual(["a"]);
    expect(toolCategories(tools)).toEqual(["Ads", "Email"]);
  });

  it("search templates by name or category", () => {
    const templates = [
      { slug: "s", name: "SEO Article", category: "SEO Article", toolSlug: "c", toolName: "C", isPremium: true },
      { slug: "f", name: "Facebook Ad", category: "Facebook Ads", toolSlug: "a", toolName: "A", isPremium: false },
    ];
    expect(queryTemplates(templates, { search: "facebook" }).map((t) => t.slug)).toEqual(["f"]);
    expect(templateCategories(templates)).toEqual(["Facebook Ads", "SEO Article"]);
  });
});

describe("helpers", () => {
  it("usage periods are calendar months in UTC", () => {
    expect(currentMonthPeriod(new Date("2026-12-31T23:59:59Z"))).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  it("firstEmbed normalizes object, array and null embeds", () => {
    expect(firstEmbed({ a: 1 })).toEqual({ a: 1 });
    expect(firstEmbed([{ a: 1 }, { a: 2 }])).toEqual({ a: 1 });
    expect(firstEmbed([])).toBeNull();
    expect(firstEmbed(null)).toBeNull();
  });
});

describe("GenerateRequestSchema", () => {
  it("accepts a minimal request and defaults inputParams", () => {
    expect(GenerateRequestSchema.parse({ toolSlug: "ad-generator" }).inputParams).toEqual({});
  });

  it("rejects oversized input and malformed ids", () => {
    expect(GenerateRequestSchema.safeParse({ toolSlug: "x", inputParams: { big: "x".repeat(20_001) } }).success).toBe(false);
    expect(GenerateRequestSchema.safeParse({ toolSlug: "x", companyProfileId: "not-a-uuid" }).success).toBe(false);
    expect(GenerateRequestSchema.safeParse({ toolSlug: "" }).success).toBe(false);
  });
});
