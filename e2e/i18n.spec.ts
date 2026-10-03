import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The interface in Russian (lib/i18n): switching there and back, what a
 * guest sees and sends, and — Russian words being longer — the same
 * accessibility and phone-width checks as e2e/a11y.spec.ts.
 */

const MOCK_OUTPUT = "E2E mock copy: fresh roasted coffee, delivered weekly.";

test("switch to Russian and back; the choice sticks across pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to write today?");

  await page.getByRole("button", { name: "Switch to Russian" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Что будем писать сегодня?");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");

  // A new page load reads the cookie on the server.
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Цены");

  // Sign-in has no header: the switch is under the form.
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Вход");
  await page.getByRole("button", { name: "Переключить на английский" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to write today?");
});

test.describe("in Russian", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "amw_locale", value: "ru", url: baseURL! }]);
  });

  test("a guest generates with Russian labels; the request keeps the form's own values", async ({ page }) => {
    await page.goto("/tools/ad-generator");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Генератор рекламы");

    await page.getByLabel("Площадка").selectOption("Facebook");
    await page.getByLabel("Что рекламируем").fill("Кофе в зёрнах");
    const cta = page.getByLabel("Призыв к действию");
    await expect(cta.locator("option", { hasText: "Купить" })).toHaveAttribute("value", "Shop Now");
    await cta.selectOption({ label: "Купить" });

    const request = page.waitForRequest("**/api/generate");
    await page.getByRole("button", { name: /Создать/ }).click();
    const body = (await request).postDataJSON() as { inputParams: Record<string, string> };
    expect(body.inputParams.callToAction).toBe("Shop Now");
    await expect(page.getByText(MOCK_OUTPUT)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ещё вариант" })).toBeVisible();
  });

  test.describe("at 360px", () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test("guest pages have no serious accessibility problem and don't scroll sideways", async ({ page }) => {
      for (const path of ["/", "/tools", "/tools/content-generator", "/templates", "/pricing", "/faq", "/login", "/register", "/privacy"]) {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", "ru");

        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const blocking = violations
          .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
          .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`);
        expect(blocking, `${path}: critical or serious accessibility violations`).toEqual([]);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} scrolls sideways at 360px`).toBeLessThanOrEqual(0);
      }
    });
  });
});
