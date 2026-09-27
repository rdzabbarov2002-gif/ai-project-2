import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, uniqueEmail } from "./helpers";

/**
 * Accessibility and phone layout (Phase 5 criteria): every key page, at
 * 360px wide and in both themes, has no critical or serious WCAG 2.1 AA
 * violation found by axe-core, and doesn't scroll sideways.
 */

const GUEST_PAGES = [
  "/",
  "/tools",
  "/tools/ad-generator",
  "/templates",
  "/pricing",
  "/faq",
  "/changelog",
  "/login",
  "/register",
  "/forgot-password",
  "/privacy",
];
const SIGNED_IN_PAGES = ["/dashboard", "/history", "/profile", "/settings/billing", "/feedback"];

test.use({ viewport: { width: 360, height: 780 } });

async function audit(page: Page, path: string) {
  await page.goto(path);
  // The page itself, not its loading state: every page has an h1.
  await expect(page.locator("h1").first()).toBeVisible();

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

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    // No saved choice, so the app follows the system setting (app/layout.tsx).
    test.use({ colorScheme });

    test("guest pages", async ({ page }) => {
      for (const path of GUEST_PAGES) await audit(page, path);
    });

    test("signed-in pages", async ({ page }) => {
      const email = uniqueEmail(`a11y-${colorScheme}`);
      const password = "e2e-password-1";
      await createUser(email, password);
      await page.goto("/login");
      await signIn(page, email, password);
      await expect(page).toHaveURL(/\/dashboard$/);

      for (const path of SIGNED_IN_PAGES) await audit(page, path);
    });
  });
}
