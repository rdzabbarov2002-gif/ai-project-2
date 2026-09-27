# Runbook

Five incidents, what you see and what to do. First, always: **Sentry**
(what fails, since when), **Vercel → Logs** (filter by `level` or
`event`), and the providers' status pages. A bad deploy is undone in one
step: Vercel → Deployments → the previous production one → Instant
Rollback (the database stays as it is — `README.md`, "Environments").

## 1. The AI is down or refuses

**You see:** a spike of `api/generate: AI provider error` in Sentry.
People get "The AI provider is
temporarily unavailable / busy right now / Couldn't reach the AI
provider. Please try again shortly." Everything else works, and a failed
generation doesn't count against anyone's allowance.

**Do:**
1. status.anthropic.com — an outage there: nothing to fix, wait.
2. Anthropic Console → Usage and Limits: the **spend limit** reached
   (raise it, or wait for the month) or the **rate limit** tier too low
   for the traffic (`docs/production.md`, "The AI provider's rate
   limits").
3. An `authentication` error: the key was revoked or rotated — see 4.
4. A long outage of one model: switch `DEFAULT_AI_MODEL` to another
   Claude model in Vercel and redeploy (run the provider tests first:
   `npm test`).

## 2. The database is down

**You see:** the uptime monitor alerts (`/api/health` answers 503);
errors in Sentry. Public pages still load; signed-in people are sent to
the sign-in page, which can't sign them in; generations fail.

**Do:**
1. status.supabase.com, then the project in the Supabase Dashboard: is it
   **paused** (Free projects pause after a week idle — Restore), out of
   disk or connections (Reports), or in maintenance?
2. Not something you can fix: Supabase support (Dashboard → Support),
   with the project ref and the time it started.
3. Data lost or damaged, not just unreachable: see 5.
4. When `/api/health` is 200 again, check a sign-in and a generation.

## 3. Payment webhooks fail

**You see:** Sentry alerts `billing: webhook event failed`; Stripe
Dashboard → Developers → Webhooks shows failed deliveries; possibly an
email from Stripe. People who paid still see Free.

**Do:**
1. Look at a failed delivery's response in Stripe:
   - **400** "Invalid signature" — `STRIPE_WEBHOOK_SECRET` in Vercel
     doesn't match the endpoint's signing secret (rotated, or test vs
     live). Copy it from the endpoint, set it, redeploy.
   - **404** "Payments are not set up" — `STRIPE_SECRET_KEY` missing in
     that deployment.
   - **500** — the app failed; the Sentry event says why (often the
     database — see 2).
2. After the fix: nothing is lost. Stripe retries each event for 3 days;
   "Resend" a failed one to apply it now.
3. Put every subscription right at once — the nightly reconciliation, by
   hand: `curl -H "Authorization: Bearer $CRON_SECRET"
   https://<domain>/api/cron/reconcile-subscriptions` (`fixed` = how many
   were corrected).

## 4. A key leaked

Rotate it at once, then check for misuse. For each: create the new one,
set it in Vercel (Production; Preview has its own), **redeploy**, check,
then revoke the old one.

| Key | Where to rotate | Meanwhile | Check misuse |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` — full database access | Supabase → Project Settings → API Keys: new secret key, delete the leaked one (legacy JWT keys: rotate the JWT secret — this signs everyone out and changes the anon key too, so set `NEXT_PUBLIC_SUPABASE_ANON_KEY` as well) | guests' generations and billing fail until the redeploy | Supabase → Logs (API, Postgres) |
| `ANTHROPIC_API_KEY` | Console → API Keys: create, then disable the old | generations fail until the redeploy | Console → Usage |
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → Roll (the old key can stay valid for a few hours) | — | Dashboard → Developers → Logs |
| `STRIPE_WEBHOOK_SECRET` | Webhooks → the endpoint → Roll secret | events fail with 400 until the redeploy; Stripe retries them | — |
| `CRON_SECRET` | `openssl rand -hex 32` | the nightly jobs answer 401 until the redeploy | Vercel logs for `/api/cron/` |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens | builds can't upload source maps | — |

Not secrets: `NEXT_PUBLIC_*` values (the Supabase URL and anon key, the
Sentry DSN) are in every visitor's browser by design; `POSTHOG_KEY` can
only send events. A key committed to git is leaked even after the commit
is removed — rotate it; GitHub secret scanning flags the known formats.

Rehearsed (locally, 2026-09-27): `CRON_SECRET` rotated — after the
restart the old secret got 401 from both cron routes, the new one 200.
Rehearse one rotation on production after launch the same way.

## 5. Restore from a backup

The full procedure, and the drill: `docs/backup-restore.md`. In short:

1. Decide the point to restore to — before the damage (Sentry and the
   logs tell when it started).
2. Restore into a **new** Supabase project (Dashboard → Database →
   Backups, or `supabase/backup.sh restore <dir> <db-url>`), never over
   the damaged one: it keeps the evidence and a way back.
3. Run the checks in `docs/backup-restore.md` ("Checks after a
   restore"). A logical restore through `backup.sh` already puts back
   what a plain dump loses (the sign-up trigger, client privileges).
4. Point Vercel at the new project (the Supabase URL and keys) and
   redeploy; update Auth URLs and SMTP in the new project
   (`README.md`, "Authentication settings").
5. Whatever happened after the backup is gone: tell the people affected;
   payments come back from Stripe with the reconciliation (3.3).
