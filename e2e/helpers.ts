import { expect, type Page } from "@playwright/test";

/**
 * Shared by the end-to-end specs: accounts through the Auth admin API,
 * table reads as the service role, Auth links from the local inbox
 * (Mailpit), and signing in through the form.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;

const adminHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
};

/** A confirmed account, created directly through the Auth admin API; its id. */
export async function createUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  expect(res.ok, `creating ${email}: ${res.status}`).toBe(true);
  return ((await res.json()) as { id: string }).id;
}

/** Adds a row as the service role — past the client privileges and RLS. */
export async function adminInsert(table: string, row: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(row),
  });
  expect(res.ok, `inserting into ${table}: ${res.status}`).toBe(true);
}

/** Rows of a table as the service role sees them (PostgREST query string). */
export async function adminSelect<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: adminHeaders });
  expect(res.ok, `reading ${table}: ${res.status}`).toBe(true);
  return (await res.json()) as T[];
}


/** The Auth link (confirmation or reset) from the newest email to `email`. */
export async function emailLink(email: string): Promise<string> {
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

export async function signIn(page: Page, email: string, password: string) {
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
