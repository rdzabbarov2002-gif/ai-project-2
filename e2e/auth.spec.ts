import { expect, test, type Page } from "@playwright/test";

/**
 * Sign-up with email confirmation, sign-in, sign-out, the return to a
 * protected page after signing in, password reset and account deletion —
 * in a browser, against the local Supabase stack. Emails are read from
 * its inbox (Mailpit).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;

/** A confirmed account, created directly through the Auth admin API. */
async function createUser(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  expect(res.ok, `creating ${email}: ${res.status}`).toBe(true);
}

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
