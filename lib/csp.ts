/**
 * Content Security Policy (Phase 7), set per request by middleware.ts.
 *
 * Scripts run only with this request's nonce: Next.js puts it on its own
 * scripts (it reads the policy from the request headers), the root layout
 * on its two inline ones. `'strict-dynamic'` lets those load the rest —
 * code-split chunks, the Sentry SDK loaded on an error. An injected
 * <script> or `on…=` attribute has no nonce and doesn't run. A nonce
 * needs every page rendered per request, which they already are
 * (docs/decisions.md §5).
 *
 * Styles allow inline: React renders `style` attributes (UsageCard's bar)
 * and hashes can't cover values computed per render. CSS can't run code;
 * the risk left is CSS-based data exfiltration, which `img-src`/
 * `connect-src` and `default-src 'self'` restrict.
 *
 * The browser talks to three origins: the app, Supabase (auth) and
 * Sentry's ingest (errors). Checkout and the billing portal are Stripe
 * pages the browser navigates to, which CSP doesn't restrict — except the
 * redirect after a form post, hence `form-action`.
 *
 * CSP_REPORT_ONLY=true sends the same policy as Report-Only: the browser
 * blocks nothing and reports what it would have blocked to
 * /api/csp-report. For a first deploy (docs/production.md).
 */

export type CspMode = "enforce" | "report-only";

export const CSP_REPORT_PATH = "/api/csp-report";

export function cspMode(env: Record<string, string | undefined> = process.env): CspMode {
  return env.CSP_REPORT_ONLY === "true" ? "report-only" : "enforce";
}

export function cspHeaderName(mode: CspMode) {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** A fresh, unguessable nonce for one response. */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function originOf(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export interface CspOptions {
  nonce: string;
  /** Development: React's dev build evaluates code for its error overlay. */
  dev?: boolean;
  supabaseUrl?: string;
  sentryDsn?: string;
}

export function buildCsp({ nonce, dev = false, supabaseUrl, sentryDsn }: CspOptions) {
  const connect = ["'self'", originOf(supabaseUrl), originOf(sentryDsn)].filter(Boolean);
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    ["connect-src", ...(connect as string[])],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'none'"],
    ["form-action", "'self'", "https://checkout.stripe.com", "https://billing.stripe.com"],
    ["frame-ancestors", "'none'"],
    ["report-uri", CSP_REPORT_PATH],
    ["report-to", "csp"],
  ];
  return directives.map((directive) => directive.join(" ")).join("; ");
}
