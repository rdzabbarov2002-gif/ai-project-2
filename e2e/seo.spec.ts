import { expect, test } from "@playwright/test";

/**
 * What search engines and link previews read (Phase 8): the sitemap, the
 * robots rules and the Open Graph / X tags with their image.
 */

test("the sitemap lists the public pages and every tool", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const path of ["/tools", "/templates", "/pricing", "/faq", "/changelog", "/privacy", "/terms", "/tools/ad-generator"]) {
    expect(xml).toContain(`${path}</loc>`);
  }
  expect(xml).not.toContain("/dashboard");
});

test("a deployment that isn't production is kept out of search results", async ({ request }) => {
  // The end-to-end run isn't production (VERCEL_ENV unset).
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});

test("public pages have their own title, description and a link preview with an image", async ({ page, request }) => {
  await page.goto("/pricing");
  await expect(page).toHaveTitle("Pricing · AI Marketing Workspace");
  const meta = (selector: string) => page.locator(selector).getAttribute("content");
  expect(await meta('meta[property="og:title"]')).toBe("Pricing");
  expect(await meta('meta[name="description"]')).toBeTruthy();
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  const image = await meta('meta[property="og:image"]');
  expect(image).toMatch(/\/opengraph-image/);

  const png = await request.get(new URL(image!).pathname);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toBe("image/png");

  await page.goto("/tools/ad-generator");
  await expect(page).toHaveTitle("AI Ad Generator · AI Marketing Workspace");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/tools\/ad-generator$/);
});

test("help for everyone: the FAQ, the changelog and the support address in every footer", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute("href", /^mailto:.+@.+/);

  await footer.getByRole("link", { name: "FAQ" }).click();
  await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
  expect(await page.locator("main h2").count()).toBeGreaterThanOrEqual(10);
  // The numbers come from the plans the app enforces.
  await expect(page.getByText("The free plan gives you 20 generations a month.")).toBeVisible();

  await page.locator("footer").getByRole("link", { name: "Changelog" }).click();
  await expect(page.getByRole("heading", { name: "1.0 — Public launch" })).toBeVisible();
});
