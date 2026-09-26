const { withSentryConfig } = require("@sentry/nextjs/config");

/**
 * Baseline security headers on every response. The full Content Security
 * Policy (scripts, styles, connections) comes later, as a production
 * readiness task — for now the CSP header carries only `frame-ancestors`,
 * which restricts nothing but who may frame the app. When the full policy
 * lands, it extends this same header.
 *
 * HSTS without `includeSubDomains`/`preload`: both are commitments for the
 * whole domain (every subdomain HTTPS-only, a browser preload list that is
 * slow to leave), to be made once the production domain is settled.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page of the app is meant to be embedded — blocks clickjacking.
  // X-Frame-Options is the same rule for browsers without CSP Level 2.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
];

/**
 * NEXT_PUBLIC_* values are compiled into the browser bundle at build time.
 * A deploy built without them ships a client that fails on every page
 * (the browser Supabase client throws), even if the server gets the
 * values later and passes its own startup check (lib/env.ts). So a
 * deployment build (Vercel sets VERCEL=1) must have them; a local or CI
 * build, which is never deployed, doesn't.
 */
if (process.env.VERCEL) {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing build-time environment variables: ${missing.join(", ")}. ` +
        "Set them for this environment in Vercel (Project Settings → Environment Variables) and redeploy.",
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PWA service worker is registered manually (see app/layout.tsx + public/sw.js)
  // rather than via a bundler plugin, to keep the build simple and phone-editable.
  experimental: {
    // instrumentation.ts (startup env check) — opt-in on Next.js 14,
    // on by default from 15.
    instrumentationHook: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry build step (runtime setup: instrumentation.ts for the server,
 * lib/report-client-error.ts for the browser). Source maps are generated
 * and uploaded only when SENTRY_AUTH_TOKEN (+ SENTRY_ORG, SENTRY_PROJECT)
 * is present in the build environment, and the browser maps are deleted
 * after upload — so stack traces in Sentry point at the original code
 * without the maps being served publicly. Without the token (local, CI)
 * no maps are generated and nothing is uploaded.
 */
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !uploadSourceMaps },
  silent: !uploadSourceMaps,
  telemetry: false,
  // Errors only — drop the SDK's tracing and debug-logging code from the bundle.
  treeshake: { removeTracing: true, removeDebugLogging: true },
});
