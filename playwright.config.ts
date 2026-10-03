import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests (e2e/): the sign-in flows, the core product path,
 * payments and accessibility, against the app, the local Supabase stack
 * (`npx supabase start`) — whose mail inbox (Mailpit) the tests read
 * emails from — and stand-ins for the Anthropic API
 * (e2e/mock-anthropic.mjs) and Stripe (e2e/mock-stripe.mjs), started
 * here.
 *
 * Locally: start the stack, then either keep `npm run dev` running (it is
 * reused) or `npm run build` first; install a browser once with
 * `npx playwright install chromium`. A reused dev server must itself run
 * with the `env` below (ANTHROPIC_BASE_URL, the STRIPE_* values), or
 * generations and payments go to the real services — or fail. CI uses the Chrome preinstalled on GitHub's runners instead of
 * downloading one.
 */
/** Shared by the app and the Stripe stand-in, which signs its events. */
const STRIPE_WEBHOOK_SECRET = "whsec_e2e_local";

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
  webServer: [
    {
      command: "node e2e/mock-anthropic.mjs",
      url: "http://127.0.0.1:4010",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node e2e/mock-stripe.mjs",
      url: "http://127.0.0.1:4011/health",
      reuseExistingServer: !process.env.CI,
      env: { STRIPE_WEBHOOK_SECRET },
    },
    {
      command: "npm run start",
      url: "http://localhost:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ANTHROPIC_BASE_URL: "http://127.0.0.1:4010",
        STRIPE_SECRET_KEY: "sk_test_e2e",
        STRIPE_WEBHOOK_SECRET,
        STRIPE_API_BASE: "http://127.0.0.1:4011",
        CRON_SECRET: "cron_e2e",
      },
    },
  ],
});
