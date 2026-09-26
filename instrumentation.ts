/**
 * Runs once when a Next.js server instance starts (next start, next dev,
 * and each serverless function's cold start on Vercel) — before it serves
 * a request. Enabled in Next.js 14 by `experimental.instrumentationHook`
 * in next.config.js.
 */
export async function register() {
  // The build needs no secrets (CI builds without any) — the check belongs
  // to the server that will use them. Next.js 14 doesn't run register()
  // during `next build`; this keeps it that way should a later version.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env");
    assertEnv();
  }
}
