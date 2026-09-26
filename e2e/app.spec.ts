import { expect, test, type Page } from "@playwright/test";

/**
 * In a browser, against the local Supabase stack and a stand-in for the
 * Anthropic API (e2e/mock-anthropic.mjs):
 * - sign-up with email confirmation, sign-in, sign-out, the return to a
 *   protected page after signing in, password reset and account deletion
 *   (emails are read from the stack's inbox, Mailpit);
 * - the core path — generate, see the result, find it in history — and
 *   the server's two limits: the plan's monthly allowance and the
 *   per-minute rate limit.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;

const adminHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
};

/** A confirmed account, created directly through the Auth admin API; its id. */
async function createUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  expect(res.ok, `creating ${email}: ${res.status}`).toBe(true);
  return ((await res.json()) as { id: string }).id;
}

/** Rows of a table as the service role sees them (PostgREST query string). */
async function adminSelect<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: adminHeaders });
  expect(res.ok, `reading ${table}: ${res.status}`).toBe(true);
  return (await res.json()) as T[];
}

const MOCK_OUTPUT = "E2E mock copy: fresh roasted coffee, delivered weekly.";
const AD_INPUTS = { platform: "Facebook", productOrService: "Coffee beans", callToAction: "Shop Now" };

/** The Auth link (confirmation or reset) from the newest email to `email`. */
async function emailLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await search.json()) as { messages?: { ID: string }[] };
    if (messages?.length) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0]!.ID}`);
      const { HTML } = (await message.json()) as { HTML: string };
      const href = HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email with an Auth link arrived for ${email}`);
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("sign up, confirm the email, sign out and sign back in", async ({ page }) => {
  const email = uniqueEmail("signup");
  const password = "e2e-password-1";

  await page.goto("/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder(/Password/).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/register\/check-email$/);

  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.locator("button:visible", { hasText: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a protected page sends you to sign in, then back to it", async ({ page }) => {
  const email = uniqueEmail("next");
  const password = "e2e-password-1";
  await createUser(email, password);

  await page.goto("/history");
  await expect(page).toHaveURL(/\/login\?next=%2Fhistory$/);
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/history$/);
});

test("reset a forgotten password by email", async ({ page }) => {
  const email = uniqueEmail("reset");
  await createUser(email, "old-password-1");

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByPlaceholder(/New password/).fill("new-password-2");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.locator("button:visible", { hasText: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/login");
  await signIn(page, email, "old-password-1");
  await expect(page.getByText(/invalid/i)).toBeVisible();
  await signIn(page, email, "new-password-2");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("delete the account", async ({ page }) => {
  const email = uniqueEmail("delete");
  const password = "e2e-password-1";
  await createUser(email, password);

  await page.goto("/login?next=/settings/billing");
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/settings\/billing$/);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/login");
  await signIn(page, email, password);
  await expect(page.getByText(/invalid/i)).toBeVisible();
});

test("generate a result and find it in history", async ({ page }) => {
  const email = uniqueEmail("generate");
  const password = "e2e-password-1";
  const userId = await createUser(email, password);

  await page.goto("/login?next=/tools/ad-generator");
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/tools\/ad-generator$/);

  await page.getByLabel("Platform").selectOption(AD_INPUTS.platform);
  await page.getByLabel("Product or service being advertised").fill(AD_INPUTS.productOrService);
  await page.getByLabel("Call to action").selectOption(AD_INPUTS.callToAction);
  await page.getByRole("button", { name: /Generate with/ }).click();
  await expect(page.getByText(MOCK_OUTPUT)).toBeVisible();

  await page.goto("/history");
  await page.getByRole("link", { name: /AI Ad Generator/ }).first().click();
  await expect(page.getByText(MOCK_OUTPUT)).toBeVisible();

  // Saved with what it cost and how long the AI call took.
  const [row] = await adminSelect<{ input_tokens: number; output_tokens: number; duration_ms: number }>(
    "generations",
    `user_id=eq.${userId}&select=input_tokens,output_tokens,duration_ms`,
  );
  expect(row).toMatchObject({ input_tokens: 812, output_tokens: 64 });
  expect(row!.duration_ms).toBeGreaterThanOrEqual(0);
});

test("the server refuses a generation over the plan's monthly limit", async ({ page }) => {
  const email = uniqueEmail("limit");
  const password = "e2e-password-1";
  const userId = await createUser(email, password);

  // Use up this month's Free allowance directly in the database.
  const [free] = await adminSelect<{ max_generations_per_month: number }>(
    "plan_limits",
    "select=max_generations_per_month,plans!inner(slug)&plans.slug=eq.free",
  );
  const now = new Date();
  const month = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
  const counter = await fetch(`${SUPABASE_URL}/rest/v1/usage_counters`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      user_id: userId,
      period_start: month(0),
      period_end: month(1),
      generations_count: free!.max_generations_per_month,
    }),
  });
  expect(counter.ok, `usage counter: ${counter.status}`).toBe(true);

  await page.goto("/login");
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);

  const res = await page.request.post("/api/generate", {
    data: { toolSlug: "ad-generator", inputParams: AD_INPUTS },
  });
  expect(res.status()).toBe(429);
  expect((await res.json()).error.code).toBe("usage_limit_reached");
});

test("the seventh generation within a minute is rate limited", async ({ page }) => {
  const email = uniqueEmail("burst");
  const password = "e2e-password-1";
  await createUser(email, password);

  await page.goto("/login");
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);

  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const res = await page.request.post("/api/generate", {
      data: { toolSlug: "ad-generator", inputParams: AD_INPUTS },
    });
    statuses.push(res.status());
    if (res.status() === 429) expect((await res.json()).error.code).toBe("rate_limited");
  }
  expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 429]);
});
