# Security checklist

The one security review before public traffic (Phase 7): the OWASP Top
10 (2021) items that apply to this app, plus secrets, dependencies and
Supabase's Advisors. Each line says how it's covered and where that is
checked. Reviewed 2026-09-27; the three lines marked **prod** are
re-run on the production project and domain before launch.

## OWASP Top 10

| # | Risk | How it's covered | Checked by |
|---|---|---|---|
| A01 | Broken access control | Row-level security on every table; clients have no write access to what they must not change (plans, usage, subscriptions, generations' owner). Signed-in pages are guarded twice (middleware and the `(auth)` layout). The service-role client is server-only and used only where RLS can't be (guests, billing). | `supabase/tests/rls.test.sql` (49 assertions), `account-deletion.test.sql`; E2E "a protected page sends you to sign in" |
| A02 | Cryptographic failures | HTTPS only (HSTS, 2 years); passwords are Supabase Auth's (bcrypt); no secret in the browser bundle — only `NEXT_PUBLIC_*` values, public by design. Logs and Sentry events carry no request bodies, cookies, headers or IPs. | `next.config.js`; `lib/sentry.ts`; the built `.next/static` contains no server key (checked) |
| A03 | Injection (SQL, XSS) | Database access only through the query builder (parameterized); no SQL built from input. React escapes all output; AI output is shown as plain text (no Markdown or HTML rendering); the only `dangerouslySetInnerHTML` are two static scripts in the root layout; no link takes its `href` from user input. The Content Security Policy blocks injected script even if escaping failed. | `e2e/csp.spec.ts` ("injected markup can't run script"); `tests/csp.test.ts` |
| A04 | Insecure design | Limits on everything that costs money: 3 generations per guest, monthly plan limits, 6 a minute per person, output capped; a payment only counts once Stripe's signed webhook says so. | `tests/limits.test.ts`, E2E limit and rate-limit tests, `e2e/billing.spec.ts` |
| A05 | Security misconfiguration | Security headers and CSP on every response; `X-Powered-By` off; errors never show stacks or internals to users; the server refuses to start with a missing or malformed variable; Supabase grants nothing to clients by default. | `e2e/csp.spec.ts`; `tests/env.test.ts`; `tests/generate-route.test.ts`; **prod:** `curl -sI https://<domain>/` shows HSTS, nosniff, Referrer-Policy, CSP, X-Frame-Options |
| A06 | Vulnerable and outdated components | `npm audit --omit=dev`: **0 vulnerabilities** (Next's bundled postcss overridden). Dependabot opens weekly updates; CI checks each. | `npm audit --omit=dev`; `.github/dependabot.yml` |
| A07 | Identification and authentication failures | Supabase Auth: email confirmation required, 8+ character passwords, sign-in and email rate limits, single-use reset links; the session is checked against Auth on every request (`getUser`, not the cookie alone). | E2E sign-up, reset, deletion; README "Authentication settings" |
| A08 | Software and data integrity failures | Stripe webhooks verified by signature, deduplicated, and re-read from Stripe; cron routes need `CRON_SECRET`; installs from the lockfile (`npm ci`); merges need green CI. | `tests/stripe-webhook.test.ts`, `tests/reconcile-route.test.ts`, `tests/monitoring.test.ts` |
| A09 | Logging and monitoring failures | Structured logs; errors to Sentry; alerts on error spikes, failing webhooks, AI spend; uptime monitor on `/api/health`. | `docs/production.md`, "Monitoring and alerts" |
| A10 | Server-side request forgery | The one server-side fetch of a user-given URL (company-profile autofill) allows only http(s) on default ports, resolves the name once and refuses private, loopback and link-local addresses, re-checks every redirect hop, and caps size and time. | `tests/profile-autofill.test.ts` |

## Also checked

| Item | Status |
|---|---|
| **CSRF** | Server Actions check the `Origin` header (Next.js). The API routes that use the session cookie (`/api/generate`, `/api/session/*`) are protected by the cookie's `SameSite=Lax` (Supabase's default): a cross-site `fetch` or form post doesn't carry it. Webhook and cron routes use no cookies. |
| **Clickjacking** | `frame-ancestors 'none'` + `X-Frame-Options: DENY`. |
| **Secrets in the repository** | None in the tree or the history (searched for Stripe, Anthropic, AWS and private-key formats); `.env` and `.env.local` are git-ignored; GitHub secret scanning is on. |
| **Secrets in the platform** | Only in Vercel's environment variables, separate per environment (`docs/production.md`, "Production configuration"). |
| **Supabase Advisors** | Security and Performance: **no issues** (local, all migrations applied). **prod:** Dashboard → Advisors on the production project — 0 ERROR. |
| **Leaked-key response** | `docs/runbook.md`, scenario 4; one rotation rehearsed. **prod:** rehearse one rotation after launch. |
| **Personal data** | Account deletion removes the Stripe customer, the account and everything it made (`account-deletion.test.sql`, E2E). |

## Accepted, for later

- The Supabase session cookie isn't `HttpOnly`: `@supabase/ssr` needs the
  browser client to read it. XSS is the way to steal it, and the CSP plus
  React's escaping close that; changing it means dropping the browser
  client.
- `style-src 'unsafe-inline'` in the CSP (`docs/decisions.md`, Phase 7).
- `/api/csp-report` takes posts from anyone; they only become log lines
  and Sentry warnings (grouped, and Sentry rate-limits a project). If it's
  abused, filter it at Vercel's firewall.
- `npm audit` (with dev dependencies) reports 2 moderate issues in Vitest's
  mocker — test tooling, not shipped; the fix is Vitest 5, a major
  upgrade for later.
