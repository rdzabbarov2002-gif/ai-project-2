# Production readiness

What has to be true before public traffic (Phase 7), how each part is
checked, and what the owner sets up by hand. Incidents: `docs/runbook.md`.

## Content Security Policy

Every page gets a policy with a fresh nonce (`lib/csp.ts`, set by
`middleware.ts`): only the app's own scripts run, the browser connects
only to the app, Supabase and Sentry, and nothing may frame the app. The
end-to-end tests run under it and fail on any violation
(`e2e/csp.spec.ts`).

Rollout on a new production deployment:

1. Set `CSP_REPORT_ONLY=true` for Production in Vercel and deploy. The
   browser now reports what the policy would block instead of blocking
   it (`frame-ancestors 'none'` stays enforced — `next.config.js`).
2. For at least **3 days** of real traffic, look at the reports: Sentry →
   Issues, search `csp`, and Vercel logs for `csp: violation`. Each issue
   is one directive and blocked origin. Explain every one:
   - blocked `https://<something>` in `connect-src`/`script-src` — a
     service the app really needs? Add it to `lib/csp.ts`, with a test;
   - `inline` or `eval` from the app's own pages — a bug, fix it;
   - a URL from a browser extension or an injected ad — not ours. (The
     endpoint already drops `chrome-extension:` and similar.)
3. Once three days pass without an unexplained report, delete
   `CSP_REPORT_ONLY` and redeploy — the policy is enforced. Check:
   `curl -sI https://<domain>/ | grep -i content-security-policy` shows
   `content-security-policy:` (not `-report-only`) with `'nonce-…'`.

## Monitoring and alerts

Everything that can go wrong on the server ends up as a Sentry event:
errors are logged through `lib/logger.ts`, and `logger.error` also goes to
Sentry. Each alert below points at those events. All alerts go by email
and to the Sentry mobile app (push). Install the app and sign in once.

| What | How it's detected | Alert (set up by the owner) | Fire it by hand, once |
|---|---|---|---|
| **Site down** | `GET /api/health`: 200 while the app serves and reads its database, 503 otherwise (3 s timeout) | Uptime monitor — UptimeRobot or Better Stack (free plans) — on `https://<domain>/api/health` every 1–5 min, keyword `"status":"ok"`, email + app push | The monitor's "send test notification"; or point a second monitor at `https://<domain>/api/health-nope` (404) and delete it after the alert |
| **Error spike** | Every `logger.error` and unhandled exception → Sentry | Sentry → Alerts → Create → *Number of errors*, environment `production`, **> 10 in 5 minutes** (tune after the beta) → email + mobile push | In the rule's editor: *Send Test Notification* |
| **AI failing** | `api/generate: AI provider error` events | Covered by the error spike rule; optionally an issue alert on tag `event` = `api/generate: AI provider error` | Same test notification |
| **Webhooks failing** | A failed event answers 500 and logs `billing: webhook event failed` (Stripe retries it for 3 days); the nightly reconciliation logs `billing: reconciliation corrected subscriptions` | Sentry issue alert: tag `event` starts with `billing:` → email + push. Stripe also emails the account when an endpoint keeps failing | In test mode (staging or a preview): `stripe trigger customer.subscription.created` — Stripe CLI; the new subscription belongs to no account, the webhook logs `billing: subscription of an unknown customer` |
| **AI spend** | `/api/cron/ai-spend`, daily at 06:15 UTC (`vercel.json`): cost of the last 24 h from the stored token counts, logs `ai: daily spend over budget` at `AI_DAILY_BUDGET_USD` (default $10) or more | Sentry issue alert: tag `event` equals `ai: daily spend over budget` → email + push | `curl -H "Authorization: Bearer $CRON_SECRET" "https://<domain>/api/cron/ai-spend?budget=0"` |

Check once each alert reached both the inbox and the phone.

## Spending limits

A limit on every paid service, so a bug, abuse or a traffic spike can't
run up an unbounded bill:

| Service | Where | What to set |
|---|---|---|
| Anthropic (AI) | Console → Settings → Limits | Monthly spend limit (e.g. 3× the expected monthly AI cost — `docs/billing.md`, "Margins"), plus the email notification threshold if offered. At the limit the API refuses calls: generations fail with the "AI is unavailable" message, the rest of the app works |
| Supabase | Organization → Billing → Spend cap | **On** (the default on Pro): usage beyond the plan's quota is stopped instead of billed |
| Vercel | Team Settings → Billing → Spend Management (Pro) | A monthly budget with email alerts at 50/75/100%, and "pause production deployments" at 100% if a pause is preferable to a bill. Hobby has no charges beyond its limits |
| Sentry | Settings → Subscription | Free plan: fixed quota, nothing to set. Paid: on-demand budget $0 |
| PostHog | Organization → Billing | Billing limit per product (product analytics); the free tier needs none |
| Stripe | — | Fees are a share of payments; nothing to cap |

The app's own limits also bound AI cost: plan limits per month, 3 free
generations per guest, 6 generations a minute per person
(`MAX_GENERATIONS_PER_MINUTE`), output capped at 8,192 tokens.
