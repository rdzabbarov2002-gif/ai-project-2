# AI Marketing Workspace

A guest-first PWA where a small business describes itself once and then uses
AI tools and ready-made templates to produce ads, emails, social posts and
long-form content — without writing prompts. Built with Next.js 14 (App
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
   inbox at http://127.0.0.1:54324.

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

1. **Supabase** — create two projects, `staging` and `prod`, and apply the
   migrations to each (`supabase/README.md`: `npx supabase link` +
   `npx supabase db push`; staging first, then prod). In each project's
   Authentication → URL Configuration, allow its `/auth/callback` URL:
   the production domain for prod, and
   `https://*-<your-vercel-team>.vercel.app/**` for staging so every
   preview URL works.
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

`/api/generate`, `/profile` and `/onboarding` declare `maxDuration = 60`
because a Claude call routinely takes longer than the default serverless
timeout — on the Hobby plan 60s is the maximum.

### Operations

- **Logs** — server code logs through `lib/logger.ts`: one JSON line per
  entry (`level`, `event`, fields), filterable in Vercel's log view.
  Errors also go to Sentry, including failures the app handles without
  crashing (a failed save, a merge error).
- **Security headers** — every response carries HSTS, `nosniff`,
  `Referrer-Policy` and `frame-ancestors 'none'` (`next.config.js`).
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

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the build on
every pull request and every push to `main`.

## Testing

`tests/` holds the unit tests: the seeded tool/template data (every form
parses, every placeholder maps to a field, `schema.sql`/`seed.sql` match the
migrations), prompt assembly, plan limits and entitlements, rate limiting,
the Claude provider's request shape and retries, the SSRF guard of profile
autofill, the open-redirect guard, the environment check and the logger.

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
supabase/         migrations/ (source of truth), config.toml (local stack),
                  schema.sql, seed.sql
tests/            unit tests
docs/             architecture, decisions, per-stage audits, reports
```
