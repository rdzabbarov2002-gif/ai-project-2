import { describe, expect, it } from "vitest";
import { faq, type FaqFacts } from "@/content/faq";
import { changelog } from "@/content/changelog";

const facts: FaqFacts = {
  guestLimit: 3,
  freeGenerations: 20,
  proGenerations: 500,
  proPrice: 29,
  trialDays: 14,
  refundDays: 14,
  perMinute: 6,
  supportEmail: "help@app.example",
  supportResponseHours: 24,
};

describe("FAQ", () => {
  it("answers at least 10 distinct questions", () => {
    const questions = faq(facts).map((entry) => entry.question);
    expect(questions.length).toBeGreaterThanOrEqual(10);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("quotes the app's own numbers and the support address", () => {
    const text = faq(facts).map((entry) => entry.answer).join("\n");
    expect(text).toContain("3 free generations");
    expect(text).toContain("20 generations a month");
    expect(text).toContain("Pro ($29 a month) gives you 500 generations a month and every template");
    expect(text).toContain("14 days free");
    expect(text).toContain("more than 6 in a minute");
    expect(text).toContain("help@app.example");
    expect(text).toContain("within 24 hours");
  });

  it("doesn't invent numbers when the plans can't be read", () => {
    const text = faq({ ...facts, freeGenerations: undefined, proGenerations: undefined, proPrice: undefined })
      .map((entry) => entry.answer)
      .join("\n");
    expect(text).toContain("The free plan gives you a monthly allowance of generations. Pro gives you more generations");
    expect(text).not.toContain("undefined");
  });

  it("says unlimited for a plan without a limit", () => {
    const cost = faq({ ...facts, proGenerations: null }).find((entry) => entry.question === "How much does it cost?")!;
    expect(cost.answer).toContain("Pro ($29 a month) gives you unlimited generations and every template");
  });
});

describe("changelog", () => {
  it("has the launch entry, newest first, with ISO dates", () => {
    expect(changelog[0]).toMatchObject({ version: "1.0", title: "Public launch" });
    for (const entry of changelog) {
      if (entry.date) expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });
});
