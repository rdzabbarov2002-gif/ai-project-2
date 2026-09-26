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

## Running it

Requirements: Node.js ≥ 20.19 and a Supabase project.

1. `npm install`
2. **Database** — in your Supabase project's SQL Editor, run
   `supabase/schema.sql`, then `supabase/seed.sql` (details, and the
   incremental path for an existing project, in `supabase/README.md`).
3. **Environment** — copy `.env.example` to `.env.local` and fill in the
   required values:

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

   `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `MISTRAL_API_KEY`, `XAI_API_KEY`
   are reserved for providers that are still stubs and aren't read yet.
4. **Supabase Auth** — add your site's `/auth/callback` URL to the allowed
   redirect URLs (Authentication → URL Configuration). With email
   confirmation on (Supabase's default), new accounts confirm by email first.
5. `npm run dev` (or `npm run build && npm start`).

### Deploying (Vercel)

Import the repository, set the variables above for Production and Preview,
and deploy. `/api/generate`, `/profile` and `/onboarding` declare
`maxDuration = 60` because a Claude call routinely takes longer than the
default serverless timeout — on the Hobby plan 60s is the maximum.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the build on
every pull request.

## Testing

`tests/` holds the unit tests: the seeded tool/template data (every form
parses, every placeholder maps to a field, `schema.sql`/`seed.sql` match the
migrations), prompt assembly, plan limits and entitlements, rate limiting,
the Claude provider's request shape and retries, the SSRF guard of profile
autofill, and the open-redirect guard.

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
supabase/         migrations/ (source of truth), schema.sql, seed.sql
tests/            unit tests
docs/             architecture, per-stage audits, completion report
```
