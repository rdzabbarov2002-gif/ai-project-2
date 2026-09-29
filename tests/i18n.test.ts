import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { ru } from "@/lib/i18n/messages/ru";
import { localeFromCookieHeader } from "@/lib/i18n/config";
import { plural } from "@/lib/i18n/plural";
import { localizeSchema, localizeTemplate, localizeText, localizeTool } from "@/lib/i18n/catalog";
import { authErrorMessage } from "@/lib/i18n/auth";
import { faq, type FaqFacts } from "@/content/faq";
import type { ToolConfigSchema } from "@/lib/tool-config/schema";

/** Every key path of a dictionary, with what kind of value sits there. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}:function`];
  if (Array.isArray(value)) return [`${path}:array(${value.length})`];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => shape(inner, path ? `${path}.${key}` : key));
  }
  return [`${path}:${typeof value}`];
}

/** Dictionaries keyed by source text (translations, not structure). */
const OPEN_ENDED = ["landing.tiles", "plans.names", "auth.supabase", "profile.websiteErrors", "generateErrors"];
const fixed = (entries: string[]) => entries.filter((entry) => !OPEN_ENDED.some((prefix) => entry.startsWith(`${prefix}.`)));

describe("dictionaries", () => {
  it("Russian has every key English has, with the same kind of value", () => {
    expect(fixed(shape(ru))).toEqual(fixed(shape(en)));
  });

  it("no Russian string is left empty, except where English is empty on purpose", () => {
    const strings = (value: unknown, path = ""): [string, string][] =>
      typeof value === "string"
        ? [[path, value]]
        : value && typeof value === "object"
          ? Object.entries(value).flatMap(([key, inner]) => strings(inner, `${path}.${key}`))
          : [];
    const english = new Map(strings(en));
    for (const [path, text] of strings(ru)) {
      if (english.get(path) === "") continue;
      expect(text.trim(), path).not.toBe("");
    }
  });

  it("interpolates numbers with the right Russian word forms", () => {
    expect(ru.landing.freeLine(3)).toBe("3 бесплатные генерации · без регистрации");
    expect(ru.landing.freeLine(5)).toBe("5 бесплатных генераций · без регистрации");
    expect(ru.plans.generationsPerMonth(21)).toBe("21 генерация в месяц");
    expect(ru.plans.startTrial(14)).toBe("Попробовать 14 дней бесплатно");
    expect(ru.runner.guestHintBefore(3)).toBe("Гостевой режим — до 3 бесплатных генераций, без регистрации.");
    expect(en.landing.freeLine(1)).toBe("1 free generation · no sign-up needed");
    expect(plural("en", 2, { one: "tool", other: "tools" })).toBe("2 tools");
  });
});

describe("the language cookie", () => {
  it("reads the choice from a Cookie header, English otherwise", () => {
    expect(localeFromCookieHeader("a=1; amw_locale=ru; b=2")).toBe("ru");
    expect(localeFromCookieHeader("amw_locale=ru")).toBe("ru");
    expect(localeFromCookieHeader("amw_locale=de")).toBe("en");
    expect(localeFromCookieHeader("xamw_locale=ru")).toBe("en");
    expect(localeFromCookieHeader(null)).toBe("en");
  });
});

describe("catalog text from the database", () => {
  const schema: ToolConfigSchema = {
    fields: [
      {
        type: "select",
        name: "callToAction",
        label: "Call to action",
        required: true,
        options: [
          { label: "Shop Now", value: "Shop Now" },
          { label: "Instagram", value: "Instagram" },
        ],
      },
      { type: "text", name: "topic", label: "Topic", placeholder: "e.g. first-time runners", required: true },
      { type: "text", name: "brandNew", label: "A label nobody translated", required: false },
    ],
  };

  it("translates labels, placeholders and choice labels — never names or values", () => {
    const localized = localizeSchema(schema, "ru");
    const [cta, topic, brandNew] = localized.fields;
    expect(cta).toMatchObject({ name: "callToAction", label: "Призыв к действию" });
    expect(cta && "options" in cta ? cta.options : []).toEqual([
      { label: "Купить", value: "Shop Now" },
      { label: "Instagram", value: "Instagram" },
    ]);
    expect(topic).toMatchObject({ name: "topic", label: "Тема", placeholder: "например, начинающие бегуны" });
    expect(brandNew?.label).toBe("A label nobody translated");
  });

  it("leaves English as it is", () => {
    expect(localizeSchema(schema, "en")).toBe(schema);
    expect(localizeText("AI Ad Generator", "en")).toBe("AI Ad Generator");
  });

  it("translates tools and templates, keeping their slugs", () => {
    expect(
      localizeTool({ slug: "ad-generator", name: "AI Ad Generator", description: null, icon: null, category: "Ads" }, "ru"),
    ).toEqual({ slug: "ad-generator", name: "Генератор рекламы", description: null, icon: null, category: "Реклама" });
    expect(
      localizeTemplate(
        { slug: "facebook-ad", name: "Facebook Ad", category: "Facebook Ads", toolSlug: "ad-generator", toolName: "AI Ad Generator", isPremium: false },
        "ru",
      ),
    ).toMatchObject({ slug: "facebook-ad", toolSlug: "ad-generator", name: "Реклама в Facebook", toolName: "Генератор рекламы" });
  });
});

describe("messages from elsewhere", () => {
  it("translates Supabase Auth's known messages and its wait time", () => {
    expect(authErrorMessage("Invalid login credentials", ru)).toBe("Неверный email или пароль.");
    expect(authErrorMessage("For security purposes, you can only request this after 42 seconds.", ru)).toBe(
      "В целях безопасности повторить можно через 42 сек.",
    );
    expect(authErrorMessage("Something new from Supabase", ru)).toBe("Something new from Supabase");
    expect(authErrorMessage("Invalid login credentials", en)).toBe("Invalid login credentials");
  });

  it("the Russian FAQ asks the same questions as the English one", () => {
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
    const english = faq(facts, "en");
    const russian = faq(facts, "ru");
    expect(russian.map((entry) => entry.id)).toEqual(english.map((entry) => entry.id));
    expect(new Set(english.map((entry) => entry.id)).size).toBe(english.length);
    const text = russian.map((entry) => entry.answer).join("\n");
    expect(text).toContain("3 бесплатные генерации");
    expect(text).toContain("20 генераций в месяц");
    expect(text).toContain("help@app.example");
    expect(text).not.toContain("undefined");
  });
});
