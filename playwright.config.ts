import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests of the sign-in flows (e2e/), against the app and the
 * local Supabase stack (`npx supabase start`), whose mail inbox (Mailpit)
 * the tests read confirmation and reset emails from.
 *
 * Locally: start the stack, then either keep `npm run dev` running (it is
 * reused) or `npm run build` first; install a browser once with
 * `npx playwright install chromium`. CI uses the Chrome preinstalled on
 * GitHub's runners instead of downloading one.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // One at a time: the tests share one Auth server and its rate limits.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // localhost, not 127.0.0.1: the Auth redirect URLs (supabase/config.toml)
    // and the session cookie are for this host.
    baseURL: "http://localhost:3000",
    channel: process.env.CI ? "chrome" : undefined,
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
