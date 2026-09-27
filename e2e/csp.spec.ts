import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, uniqueEmail } from "./helpers";

/**
 * The Content Security Policy, enforced (lib/csp.ts): the app works under
 * it — every key page and the core path run without a single violation —
 * and it does its job: markup injected into a page can't run script.
 * The rest of the suite runs under the same enforced policy too.
 */

const MOCK_OUTPUT = "E2E mock copy: fresh roasted coffee, delivered weekly.";

/** Chrome logs each violation to the console; collects them for the page's life. */
function watchViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(`${page.url()}: ${message.text()}`);
  });
  return violations;
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeVisible();
  // Let hydration, the service worker registration and late chunks run.
  await page.waitForLoadState("load");
}

test("every response carries an enforced policy with a fresh nonce", async ({ page }) => {
  const first = await page.goto("/");
  const second = await page.goto("/login");
  const policy = first!.headers()["content-security-policy"]!;
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("frame-ancestors 'none'");
  const nonce = (header: string) => /'nonce-([^']+)'/.exec(header)?.[1];
  expect(nonce(policy)).toBeTruthy();
  expect(nonce(second!.headers()["content-security-policy"]!)).not.toBe(nonce(policy));
  expect(first!.headers()["reporting-endpoints"]).toBe('csp="/api/csp-report"');
});

test("guest pages and a guest generation run without a violation", async ({ page }) => {
  const violations = watchViolations(page);
  for (const path of ["/", "/tools", "/templates", "/pricing", "/login", "/register", "/forgot-password", "/privacy", "/terms"]) {
    await visit(page, path);
  }

  await visit(page, "/tools/ad-generator");
  await page.getByLabel("Platform").selectOption("Facebook");
  await page.getByLabel("Product or service being advertised").fill("Coffee beans");
  await page.getByLabel("Call to action").selectOption("Shop Now");
  await page.getByRole("button", { name: /Generate with/ }).click();
  await expect(page.getByText(MOCK_OUTPUT)).toBeVisible();

  expect(violations).toEqual([]);
});

test("signed-in pages run without a violation", async ({ page }) => {
  const violations = watchViolations(page);
  const email = uniqueEmail("csp");
  await createUser(email, "e2e-password-1");
  await page.goto("/login");
  await signIn(page, email, "e2e-password-1");
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const path of ["/dashboard", "/tools/content-generator", "/history", "/profile", "/settings/billing", "/feedback"]) {
    await visit(page, path);
  }
  // The theme toggle's saved choice is applied by the inline script on the next load.
  await page.evaluate(() => localStorage.setItem("amw_theme", "dark"));
  await visit(page, "/dashboard");
  await expect(page.locator("html")).toHaveClass(/dark/);

  expect(violations).toEqual([]);
});

test("injected markup can't run script", async ({ page }) => {
  const violations = watchViolations(page);
  await visit(page, "/");

  await page.evaluate(() => {
    const box = document.createElement("div");
    box.innerHTML = `<img src="/missing.png" onerror="window.__injected = true">`;
    document.body.append(box);
  });

  await expect.poll(() => violations.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as { __injected?: boolean }).__injected)).toBeUndefined();
  expect(violations.join("\n")).toContain("script-src");
});
