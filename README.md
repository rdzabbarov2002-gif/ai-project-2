# AI Marketing Workspace

A guest-first PWA where a small business describes itself once and then uses
AI tools and ready-made templates to produce ads, emails, social posts and
long-form content — without writing prompts. Built with Next.js 15 (App
Router), Supabase (Postgres + Auth + RLS) and an AI Provider Gateway
(Claude today, other providers pluggable).

The architecture and the 15-stage plan are in
`docs/ai-marketing-workspace-architecture.md`; every stage has its own audit
report in `docs/`, and `docs/stage8-15-completion-report.md` covers the
completion of stages 8–15 and the first real build, test and integration run.

## What's in it

- **Guest mode** — every tool works without an account (3 free generations
  by default), with an optional short business profile; signing up moves the
  guest's results and profile into the account.
- **Tools** — Ad, Email, Social Media generators and a Content Writer, all
  defined as data (`tools.config_schema`) and rendered by one `ToolRunner`.
- **Templates Library** — 20 templates across 16 categories, some Pro-only.
- **Company profile** — onboarding wizard and profile form, with autofill
  from the company's website.
- **History** — filters, favorites, copy, and "use these inputs again".
- **Plans and limits** — Free / Pro / Enterprise limits from the database,
  monthly allowance shown up front, burst rate limiting; payments are not
  part of the MVP (upgrade buttons say "coming soon").
- **UI** — responsive navigation (sidebar / bottom tabs), light and dark
  themes meeting WCAG AA contrast, installable PWA with an offline page.

## Running it locally

Requirements: Node.js ≥ 20.19, Docker (for the local database) and an
Anthropic API key.

1. `npm install`
2. `npx supabase start` — starts Postgres, Auth and the API in Docker
   (config: `supabase/config.toml`) and applies every migration in
   `supabase/migrations/`, data included. The first run downloads the
   images and takes a few minutes; later starts take seconds.
3. `cp .env.example .env.local`, then fill in the four required values —
   `npx supabase status -o env` prints the local ones:

   | `.env.local` | Local value (`supabase status -o env`) |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |
   | `ANTHROPIC_API_KEY` | your Anthropic key |

4. `npm run dev` → http://localhost:3000. Studio (database browser) is at
   http://127.0.0.1:54323, and emails Auth sends locally land in the
   inbox at http://127.0.0.1:54324 — as in production, a new account
   confirms its email first: open the link from that inbox.

`npx supabase stop` stops the stack (data is kept); `npx supabase db reset`
rebuilds the database from the migrations.

No Docker? Use a hosted Supabase project instead of steps 2–3's local
values — setup in `supabase/README.md`.

### Environment variables

The server checks these when it starts (`lib/env.ts`, run from
`instrumentation.ts`): a missing or malformed one stops it with an error
naming the variable. `.env.example` describes each.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key for guest sessions, merge, usage counters |
| `ANTHROPIC_API_KEY` | yes | Claude — generation and profile autofill |
| `NEXT_PUBLIC_SITE_URL` | no | Origin for email-confirmation links (auto-detected otherwise) |
| `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` | no | Defaults `claude` / `claude-sonnet-5` |
| `GUEST_GENERATION_LIMIT` | no | Guest allowance, default 3 |
| `MAX_GENERATIONS_PER_MINUTE` | no | Burst limit per user/guest, default 6 |
| `NEXT_PUBLIC_SENTRY_DSN` | no | Error tracking; off when unset |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | no, build only | Source map upload to Sentry |
| `POSTHOG_KEY` / `POSTHOG_HOST` | no | Product analytics (PostHog project key; host defaults to the US cloud) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | no (both or neither) | Payments; off when unset (`docs/billing.md`) |
| `CRON_SECRET` | with payments | Protects the nightly subscription check |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | in production | Support address: footer, FAQ, Privacy, Terms |
| `LEGAL_OPERATOR`, `LEGAL_COUNTRY`, `EMAIL_PROVIDER` | in production | Who runs the service, as the Privacy Policy and Terms name it; placeholders ("Draft") elsewhere |

`OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `MISTRAL_API_KEY`, `XAI_API_KEY`
are reserved for providers that are still stubs and aren't read yet.

`NEXT_PUBLIC_*` values are compiled into the browser code at build time:
after changing one on Vercel, redeploy. A Vercel build without the two
`NEXT_PUBLIC_SUPABASE_*` values fails on purpose.

## Environments and deployment (Vercel)

| Environment | Where it runs | Database |
|---|---|---|
| Development | your machine | local Supabase (`npx supabase start`) |
| Preview | Vercel, one URL per pull request | Supabase project **staging** |
| Production | Vercel, from `main` | Supabase project **prod** |

1. **Supabase** — create two projects, `staging` and `prod`, apply the
   migrations to each (`supabase/README.md`: `npx supabase link` +
   `npx supabase db push`; staging first, then prod), and configure Auth
   in each as below.
2. **Vercel** — import the repository. Under Project Settings →
   Environment Variables, give **Production** the prod project's values
   and **Preview** the staging project's, plus `ANTHROPIC_API_KEY` for
   both. Every pull request then gets its own preview URL, and every
   merge to `main` deploys to production.
3. **Sentry** (optional, recommended) — create a Next.js project and set
   `NEXT_PUBLIC_SENTRY_DSN` for Production and Preview; events are
   tagged `production`/`preview` automatically. For readable stack
   traces also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`:
   the build then uploads source maps and removes them from the deploy.
4. **Rollback** — Vercel → Deployments → a previous production
   deployment → Instant Rollback. The database isn't rolled back with it,
   so a migration has to keep working with the previous deployment's code
   (add columns and tables; remove them only once no deployed code uses
   them).

### Authentication settings (each Supabase project)

The local stack already runs with these (`supabase/config.toml`); a
hosted project needs them set by hand.

| Where (Supabase dashboard) | Production | Staging |
|---|---|---|
| Authentication → URL Configuration → Site URL | `https://<your-domain>` | a preview URL or the staging domain |
| … → Redirect URLs | `https://<your-domain>/**` | `https://*-<your-vercel-team>.vercel.app/**` |
| Authentication → Sign In / Providers → Email | Confirm email **on**, minimum password length **8** | same |
| Project Settings → Authentication → SMTP | your provider (below) | same provider, or the built-in one for testing |

Confirmation and password-reset links come back to `/auth/callback`
(the reset link with `?next=/reset-password`), so the redirect URLs must
cover that path on every domain the app runs on.

**Email (SMTP).** Supabase's built-in sender is for testing only: a few
emails an hour, delivered only to your team's addresses. For real users:

1. Create an account with a transactional email provider (Resend,
   Postmark, Amazon SES, …) and verify your domain there.
2. Add the DNS records it gives you: **SPF** and **DKIM**, plus a
   **DMARC** record — `_dmarc.<your-domain>` TXT
   `v=DMARC1; p=none; rua=mailto:<your address>` is a safe start.
3. Enter the provider's SMTP host, port, user and password in Supabase
   (Project Settings → Authentication → SMTP), with a sender address on
   your domain, e.g. `no-reply@<your-domain>`.
4. Raise Authentication → Rate Limits → emails per hour to fit your
   expected sign-ups.
5. Check: send a sign-up email to the address mail-tester.com gives you
   (aim for 9/10 or better, SPF/DKIM/DMARC passing), and confirm that
   the emails reach the inbox, not spam, in Gmail and Outlook.

The default email templates work as they are.

`/api/generate`, `/profile` and `/onboarding` declare `maxDuration = 60`
because a Claude call routinely takes longer than the default serverless
timeout — on the Hobby plan 60s is the maximum.

### Operations

- **Logs** — server code logs through `lib/logger.ts`: one JSON line per
  entry (`level`, `event`, fields), filterable in Vercel's log view.
  Errors also go to Sentry, including failures the app handles without
  crashing (a failed save, a merge error).
- **Security headers** — every response carries HSTS, `nosniff`,
  `Referrer-Policy` and `frame-ancestors 'none'` (`next.config.js`), and
  every page a Content Security Policy with a per-request nonce
  (`lib/csp.ts`); rolling it out in Report-Only mode first:
  `docs/production.md`.
- **Product analytics** — with `POSTHOG_KEY` set, the server sends events
  to PostHog: `site_visited` (a page opened by someone not signed in:
  the page, the referring site and `utm_*` tags — `lib/visitor.ts`),
  `signed_up`, `generation_completed` (tool, template, guest or not),
  `generation_blocked` (which limit), `subscription_started` (plan,
  trial or not) and `payment_succeeded` (amount), `feedback_sent`,
  `account_deleted`, and aliases linking a guest's events and that day's
  visits to the account they sign up for. No cookies and nothing in the
  browser: a visitor is a pseudonymous ID (a keyed hash of the date, IP
  and browser) that changes daily. The funnel visit → sign-up → first
  result → payment: `docs/launch.md`.
- **Feedback** — signed-in people write to us from "Send feedback" in the
  footer (`/feedback`; at most 10 messages an hour each). The `feedback`
  table is server only; read it in the Supabase SQL Editor:

  ```sql
  select f.created_at, u.email, f.message
  from public.feedback f join auth.users u on u.id = f.user_id
  order by f.created_at desc;
  ```
- **Cost and speed of generations** — every generation stores its token
  counts and how long the AI call took (`generations.input_tokens`,
  `output_tokens`, `duration_ms`). In the Supabase SQL Editor (prices:
  Claude Sonnet 5, $2 input / $10 output per million tokens — check
  Anthropic's pricing page when they change):

  ```sql
  select ai_model, count(*) as generations,
    round(avg(input_tokens * 2 + output_tokens * 10) / 1000000.0, 5) as avg_cost_usd,
    round((percentile_cont(0.95) within group
      (order by input_tokens * 2 + output_tokens * 10) / 1000000.0)::numeric, 5) as p95_cost_usd,
    round(avg(duration_ms)) as avg_ms,
    percentile_cont(0.95) within group (order by duration_ms) as p95_ms
  from public.generations
  where input_tokens is not null and created_at > now() - interval '30 days'
  group by ai_model;
  ```
- **Payments** — Stripe Checkout, the Customer Portal, a signed and
  idempotent webhook, and a nightly reconciliation with Stripe
  (`vercel.json`). Setting up test and live mode, the scenarios to run,
  and the margins per plan: `docs/billing.md`.
- **Closed beta** — what to set up before inviting people, and the
  numbers to watch (activation, time to a first result, feedback) with
  the SQL that produces them: `docs/beta.md`.
- **Backups** — Supabase's daily backups need the Pro plan (the Free plan
  has none); `supabase/backup.sh` takes and restores a logical backup.
  How to check a backup's age, restore into a new project and run the
  restore drill: `docs/backup-restore.md`.
- **Health and alerts** — `GET /api/health` for the uptime monitor (200,
  or 503 when the database can't be read); Sentry alerts on error spikes
  and failing webhooks; a daily AI spend check (`/api/cron/ai-spend`,
  `AI_DAILY_BUDGET_USD`); spending limits per service:
  `docs/production.md`.
- **Launch** — the funnel in PostHog, the checklist before launch
  (Search Console, link previews, legal review), the announcement drafts
  per channel with their tracking links, and the first 14 days:
  `docs/launch.md`. Search engines get `sitemap.xml` and `robots.txt`
  (production only is indexed); the public pages have titles,
  descriptions and a link preview image (`config/site.ts`).
- **Production readiness and incidents** — what to set up before public
  traffic (keys per environment, alerts, spending limits, the CSP
  rollout, performance targets and results): `docs/production.md`; the
  security review: `docs/security-checklist.md`; what to do when the AI
  or the database is down, webhooks fail, a key leaks, or data must be
  restored: `docs/runbook.md`.
- **Dependencies** — Dependabot opens weekly update PRs
  (`.github/dependabot.yml`); CI checks each one.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests: sign-in flows, the core product path, payments and accessibility (Playwright, local Supabase running) |
| `npm run test:load` | Load smoke test: 50 people at once on the main path, AI mocked (`docs/production.md`) |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` from the local database |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the build on
every pull request and every push to `main`; in parallel jobs it builds
the database from the migrations and runs the database checks (RLS tests,
Supabase advisors, generated types up to date — `supabase/README.md`), and
runs the end-to-end tests against a local Supabase stack.

## Testing

`tests/` holds the unit tests: the seeded tool/template data (every form
parses, every placeholder maps to a field, `schema.sql`/`seed.sql` match the
migrations), prompt assembly, plan limits and entitlements, rate limiting,
the Claude provider's request shape and retries, the SSRF guard of profile
autofill, the open-redirect guard, the environment check and the logger,
the Content Security Policy and its report endpoint, the health check and
the AI spend alert.

`supabase/tests/` (pgTAP, `npx supabase test db`) checks row level
security and client privileges on every table, and that deleting an
account leaves none of its rows behind.

`e2e/app.spec.ts` (Playwright, `npm run test:e2e`) runs in a browser:
sign-up with email confirmation, sign-in and sign-out, returning to a
protected page after signing in, password reset and account deletion, the
feedback form; and the core path — generate, see the result, find it in
history and favorite it — plus the server's monthly plan limit and
per-minute rate limit. `e2e/a11y.spec.ts` checks the key pages, guest and
signed in, at 360px in the light and dark theme: no critical or serious
WCAG 2.1 AA violation (axe-core) and no sideways scrolling.
`e2e/billing.spec.ts` runs the payment scenarios — subscribe with a
trial, trial → payment, trial → cancel, plan up and down, a declined card
(past due → Free), cancel at period end, refund — plus the webhook's
signature and replay checks, the nightly reconciliation and deleting a
paying account. `e2e/csp.spec.ts` runs the key pages and a generation
under the enforced Content Security Policy and fails on any violation.
The AI and Stripe are local stand-ins
(`e2e/mock-anthropic.mjs`, `e2e/mock-stripe.mjs`, started by Playwright;
the Stripe one sends signed webhook events like Stripe), so the tests
cost nothing and need no keys. It needs the local Supabase stack running (the tests
read emails from its inbox) and a browser: `npx playwright install
chromium` once.

End-to-end behavior was verified against a local Supabase stack (Supabase
CLI: Postgres, GoTrue, PostgREST) with a stand-in for the Anthropic API and a
headless browser; the scenarios and results are listed in
`docs/stage8-15-completion-report.md`.

## Project layout

```
app/(guest)/      landing, Tools, Templates, tool pages — no login needed
app/(auth)/       Dashboard, Onboarding, Profile, History, Billing
app/api/          /generate, /session/merge, /session/draft
components/       ui/ (design system), layout/, tools/, templates/, …
lib/              generation/ (pipeline), ai-provider/, supabase/, limits/,
                  profile-autofill/, history/, tools/, templates/, …
supabase/         migrations/ (source of truth), tests/ (RLS), config.toml (local stack),
                  schema.sql, seed.sql
tests/            unit tests
docs/             architecture, decisions, per-stage audits, reports
```
