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

module.exports = nextConfig;
