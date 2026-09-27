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

## Load smoke test

`scripts/load-smoke.mjs` (`npm run test:load`): 50 people sign in and at
the same moment go through the main path three times — dashboard, the ad
tool, a generation, history. It fails if 1% or more of the requests
fail, or if a generation isn't saved. The AI is the local stand-in with a 2-second answer, like a real
call; the script stops at the first answer that isn't the stand-in's, so
it can't spend money. It creates its accounts and deletes them after.

```bash
npx supabase start && npm run build
MOCK_AI_DELAY_MS=2000 node e2e/mock-anthropic.mjs &
ANTHROPIC_BASE_URL=http://127.0.0.1:4010 npm run start &
npm run test:load    # --users 50 --rounds 3 are the defaults
```

The environment variables are the local stack's, as for the end-to-end
tests (`README.md`, Testing).

Result (2026-09-27, one local `next start` process with the local
Supabase stack, in a small container):

| Step | Requests | Failed | p50 | p95 |
|---|---|---|---|---|
| GET /dashboard | 150 | 0 | 1.9 s | 4.1 s |
| GET /tools/ad-generator | 150 | 0 | 1.5 s | 2.0 s |
| POST /api/generate (AI: 2 s) | 150 | 0 | 3.3 s | 4.0 s |
| GET /history | 150 | 0 | 1.0 s | 2.0 s |
| **All** | **600** | **0 (0.00%)** | | |

150 generations answered, 150 saved.

The times are those of a single server process on one small machine
serving 50 people at once: it rendered every page itself. On Vercel each
request gets its own function instance, so the times are closer to one
person's. What the test proves is that nothing breaks under concurrency:
no failed request, and every generation answered is saved (the script
counts them in the database). Against staging (with its AI pointed at the
stand-in): `BASE_URL=https://<staging> npm run test:load -- --allow-remote`.

### The AI provider's rate limits

Anthropic limits each organization by tier: requests per minute (RPM),
input tokens per minute (ITPM) and output tokens per minute (OTPM) — see
Console → Settings → Limits for the current numbers. A generation is one
request, about 1,500–3,000 input tokens, and 1,500 output tokens on
average (8,192 at most). The app doesn't retry a rate-limited request:
the person sees "The AI provider is busy right now. Please try again
shortly.", and the error goes to Sentry.

What the limits must cover: at peak, **people generating at the same time
× 2** requests a minute (an answer takes about 30 s, and people read it
before generating again). For 50 at once: 100 RPM, ~300,000 ITPM, ~150,000
OTPM. Before launch, compare with the organization's tier; if it's lower,
move up a tier (Console → Billing: tiers rise with credit purchased) or
ask Anthropic for a higher limit. During the beta (10–20 people) the
first tiers are usually enough — check the numbers anyway.

## Performance

### Core Web Vitals

Target (mobile, 75th percentile of real visits): LCP ≤ 2.5 s, INP ≤ 200
ms, CLS ≤ 0.1 on the landing page, the dashboard and the main tool.

**Real visits** are measured by Vercel Speed Insights: in production the
root layout loads its script (`/_vercel/speed-insights/script.js`, same
origin, no cookies). Turn it on once: Vercel → the project → Speed
Insights → Enable. Then Speed Insights → Mobile, P75, per route: `/`,
`/dashboard`, `/tools/[slug]`. Read it once the beta has had a few
hundred visits; a page over target is the one place to optimize.

**Lab measurement** before launch (Lighthouse 12, mobile preset:
emulated mid-range phone, slow 4G, 4× CPU slowdown; median of 3 runs;
`next start` locally, signed in for the dashboard). Lighthouse can't
measure INP; Total Blocking Time is its stand-in (≤ 200 ms is good):

| Page | LCP | CLS | TBT | Performance score |
|---|---|---|---|---|
| `/` | 1.9 s | 0 | 53 ms | 100 |
| `/dashboard` | 2.45 s | 0.073 | 61 ms | 97 |
| `/tools/ad-generator` | 1.7 s | 0 | 91 ms | 99 |

All within target, so nothing was optimized. The dashboard is the one to
watch: its LCP is the text under the page title, which arrives with the
rest of the page after its database reads (usage, recent generations),
and the CLS is the footer moving down when that content replaces the
loading skeleton. If real visits put it over target, render the page
without `loading.tsx` or give the skeleton the content's height.

JavaScript: about 190 kB compressed on each of the three pages, the same
shared chunks (React, Next.js, the Supabase client). No images besides
the icons.

### Database queries

Target: none of the 10 queries with the most total time has a p95 over
100 ms. `pg_stat_statements` gives each query's mean, standard deviation
and maximum; mean + 2 × stddev is an upper estimate of p95. On the
production project (SQL Editor; Supabase has the extension on by
default — also Reports → Query Performance):

```sql
select round(total_exec_time::numeric) as total_ms, calls,
  round(mean_exec_time::numeric, 2) as mean_ms,
  round((mean_exec_time + 2 * stddev_exec_time)::numeric, 2) as p95_upper_ms,
  round(max_exec_time::numeric, 2) as max_ms,
  left(regexp_replace(query, '\s+', ' ', 'g'), 120) as query
from extensions.pg_stat_statements
where dbid = (select oid from pg_database where datname = current_database())
order by total_exec_time desc
limit 10;
```

Measured locally under the load smoke test (statistics reset first):
the top 10 are Auth's session lookups (every request checks the
session), setting the request's role, reading the plan and usage, and
saving a generation. The highest p95 estimate was **9.3 ms**, the highest
single run 49 ms. Deleting an account, with all its cascades, takes 4 ms.
