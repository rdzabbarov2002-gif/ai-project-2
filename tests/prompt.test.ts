import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/generation/prompt";
import type { ResolvedTemplate, ResolvedTool } from "@/lib/generation/catalog";

const tool: ResolvedTool = { id: "t1", slug: "ad-generator", name: "AI Ad Generator", configSchema: {} };
const template: ResolvedTemplate = {
  id: "tpl1",
  slug: "facebook-ad",
  name: "Facebook Ad",
  promptTemplate: "Ad for {{ productOrService }} — offer: {{offerDetails}} — CTA: {{callToAction}}",
  requiredFields: ["productOrService", "callToAction"],
  configSchema: null,
  isPremium: false,
};

describe("buildUserPrompt", () => {
  it("fills {{placeholders}} (with or without inner spaces) from the inputs", () => {
    const prompt = buildUserPrompt({
      tool,
      template,
      inputParams: { productOrService: "Sourdough", offerDetails: "10% off", callToAction: "Shop Now" },
    });
    expect(prompt).toBe("Ad for Sourdough — offer: 10% off — CTA: Shop Now");
  });

  it("renders a missing or null input as an empty string, never 'undefined'", () => {
    const prompt = buildUserPrompt({
      tool,
      template,
      inputParams: { productOrService: "Sourdough", offerDetails: null },
    });
    expect(prompt).toBe("Ad for Sourdough — offer:  — CTA: ");
  });

  it("falls back to a structured generic prompt without a template", () => {
    const prompt = buildUserPrompt({ tool, template: null, inputParams: { topic: "x" } });
    expect(prompt).toContain("Task: AI Ad Generator");
    expect(prompt).toContain('"topic": "x"');
  });
});

describe("buildSystemPrompt", () => {
  it("includes only the company fields that are filled in", () => {
    const system = buildSystemPrompt({ name: "Acme", niche: "Bakery", usp: "" }, tool);
    expect(system).toContain("- Company name: Acme");
    expect(system).toContain("- Niche/industry: Bakery");
    expect(system).not.toContain("Unique selling point");
  });

  it("tells the model not to invent company facts when there is no profile", () => {
    for (const context of [null, { name: "  " }]) {
      expect(buildSystemPrompt(context, tool)).toContain("avoid inventing specific company facts");
    }
  });
});
