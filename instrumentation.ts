import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry";

/**
 * Runs once when a Next.js server instance starts (next start, next dev,
 * and each serverless function's cold start on Vercel) — before it serves
 * a request.
 */
export async function register() {
  // The build needs no secrets (CI builds without any) — the check belongs
  // to the server that will use them, not to `next build`.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env");
    assertEnv();
  }

  // Error tracking for server code (Server Components, Route Handlers,
  // Server Actions, middleware); the browser side loads on demand in
  // lib/report-client-error.ts. What is (not) sent: lib/sentry.ts.
  if (sentryOptions.dsn) {
    Sentry.init(sentryOptions);
  }
}
