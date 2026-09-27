# Launch

The public launch (Phase 8): how its success is measured, the materials
for announcing it, and the first 14 days after it.

## The funnel

Four steps, all sent from the server to PostHog (`README.md`, "Product
analytics") — no cookies, so no consent banner:

| Step | Event | Sent when |
|---|---|---|
| Visit | `site_visited` | someone not signed in opens a page (`lib/visitor.ts`, from middleware) — with `path`, `referrer_domain`, `utm_source/medium/campaign` |
| Sign-up | `signed_up` | an account is created (`app/register/actions.ts`) |
| First result | `generation_completed` | a generation succeeds — also as a guest; the guest's events join the account when they sign up |
| Payment | `subscription_started` → `payment_succeeded` | Checkout completes (a trial or a paid start), then each invoice that takes money (`app/api/stripe/webhook`) |

A visit is linked to the account by a daily visitor ID (a keyed hash of
the date, IP and browser): signing up aliases that day's ID to the new
account. So visit → sign-up joins people who sign up on the day they
visit, from the same browser; a sign-up days later starts the funnel at
"sign-up". Several people behind one IP with the same browser version
share an ID for a day — noise, not a leak.

**Building it in PostHog** (Product analytics → New insight → Funnel):

1. Steps: `site_visited` → `signed_up` → `generation_completed` →
   `subscription_started`. Add `payment_succeeded` as a fifth step once
   trials have ended (14 days in).
2. Conversion window: 14 days. Aggregating by: unique persons.
3. Breakdown by `utm_source` (first step) to compare the launch channels.
4. Save it to a dashboard "Launch" with two trends next to it: daily
   `signed_up`, and daily `payment_succeeded` (sum of `amount`).

**Activation** (a sign-up who gets a first result): the funnel
`signed_up` → `generation_completed` with a 7-day window; the SQL in
`docs/beta.md` gives the same from the database.
