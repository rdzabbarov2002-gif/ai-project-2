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

## Before launch

Everything in `docs/production.md` ("Before public traffic") first. Then:

- [ ] **Vercel, Production:** `NEXT_PUBLIC_SITE_URL=https://<domain>`,
  `NEXT_PUBLIC_SUPPORT_EMAIL`, `LEGAL_OPERATOR` (entity and address),
  `LEGAL_COUNTRY`, `EMAIL_PROVIDER`; redeploy. The server refuses to
  start in production without the last four.
- [ ] **Privacy Policy and Terms** read by a lawyer for your country; if
  the text changes, update `site.legalUpdated` (`config/site.ts`). Check
  both pages show no "Draft".
- [ ] **Support inbox:** the support address reaches someone who answers
  within 24 hours (the FAQ promises it); an auto-reply saying so helps.
- [ ] **Search Console** (search.google.com/search-console): add the
  domain (DNS TXT record), submit `https://<domain>/sitemap.xml`. After a
  few days: Pages → no indexing errors for the pages in the sitemap
  (`/dashboard` and the like are excluded by `robots.txt`, which is
  expected). Bing Webmaster Tools can import from Search Console.
- [ ] **Link previews** — paste `https://<domain>/` and
  `https://<domain>/pricing` into:
  LinkedIn Post Inspector (linkedin.com/post-inspector),
  Facebook Sharing Debugger (developers.facebook.com/tools/debug),
  and a draft post on X. Each shows the title, description and the blue
  preview image.
- [ ] **PostHog:** the funnel and the "Launch" dashboard (above).
- [ ] **Changelog:** the date of the 1.0 entry in `content/changelog.ts`
  set to launch day; deploy.
- [ ] **Goals** for the 14 days written into the table below.

## Goals for the first 14 days

Replace the example numbers with yours before launch.

| Goal | Target (example) | Where it's read |
|---|---|---|
| Sign-ups | 100 | PostHog `signed_up`, or `select count(*) from auth.users where created_at > '<launch day>'` |
| Activation (a first result within 7 days of signing up) | 40% | the activation funnel above; `docs/beta.md` SQL |
| Paying customers | 3 | PostHog `payment_succeeded` (unique persons); Stripe → Customers |
| Uptime | ≥ 99.5% (≤ 1 h 40 min down in 14 days) | the uptime monitor's report |
| P0 bugs open longer than 24 h | 0 | the daily log below |
| Support answered within 24 h | every message | the support inbox |

With a 14-day trial, the first payments land on day 14 at the
earliest: count paying customers as trials that convert, and look again
at day 28.

## Announcing it

Order: beta participants and people who asked to be told first, then the
public channels on the same day (Product Hunt resets at 00:01 Pacific —
post there first). Every link carries its channel, so the funnel shows
which one brought people who stayed:

| Channel | Link |
|---|---|
| Invitation email | `https://<domain>/?utm_source=email&utm_medium=invite&utm_campaign=launch` |
| Product Hunt | `https://<domain>/?utm_source=producthunt&utm_medium=launch&utm_campaign=launch` |
| Reddit | `https://<domain>/?utm_source=reddit&utm_medium=post&utm_campaign=launch` |
| X | `https://<domain>/?utm_source=x&utm_medium=post&utm_campaign=launch` |
| LinkedIn | `https://<domain>/?utm_source=linkedin&utm_medium=post&utm_campaign=launch` |

There's no waitlist in the app: the invitation goes to the beta
participants, by hand from the support address. Send it only to people
who agreed to hear from you.

The drafts below are starting points — put your own voice and the story
of why you built it in them.

**Invitation email** — subject: *AI Marketing Workspace is live*

> Hi {name},
>
> Thank you for trying AI Marketing Workspace during the beta — your
> feedback shaped what's launching today: {one thing you changed because
> of them}.
>
> It's now open to everyone: {link}. Your account and everything you
> made are still there. Pro now comes with a 14-day free trial.
>
> We're on Product Hunt today — if it helped you, a comment there would
> mean a lot: {Product Hunt link}.
>
> Reply to this email any time; I read every one.

**Product Hunt**
- Name: AI Marketing Workspace
- Tagline (≤ 60 characters): *Marketing copy for your business, in seconds*
- Description (≤ 260 characters): *Ads, emails, social posts and articles
  written for your business — describe it once (or paste your website),
  pick a tool, fill in a few fields. No prompts to write. Try any tool
  free without signing up.*
- Gallery: the preview image (`/opengraph-image`), then screenshots of a
  tool with a result, the template library, history — on a phone too.
- First comment (maker): who it's for (small businesses without a
  marketer), why ("prompting a chatbot for every ad takes longer than
  writing it"), what's free (3 tries without an account, 20 generations a
  month), and a question for the audience.

**Reddit** — read each subreddit's self-promotion rules first (r/SaaS,
r/Entrepreneur, r/smallbusiness, r/marketing…): many allow it only in a
weekly promotion thread, some not at all, and a removed post can't be
reposted. Lead with the problem and what you learned, not the product:

> **I built a tool that writes ads and emails from a one-time company
> profile — here's what 2 weeks of beta taught me**
>
> {two or three honest lessons from the beta}. It's live now, free to
> try without an account: {link}. I'd love to hear where it falls short.

**X** (a short thread):

> 1/ Launching today: AI Marketing Workspace — ads, emails and social
> posts written for *your* business, in seconds. No prompts. {link}
>
> 2/ Describe your business once (or paste your website). Every tool
> uses it — the voice, the audience, what you sell.
>
> 3/ 20 templates: Facebook ads, launch emails, SEO articles, YouTube
> scripts… Try any tool free, no sign-up.
>
> 4/ We're on Product Hunt today: {Product Hunt link}

**LinkedIn:**

> Today I'm launching AI Marketing Workspace.
>
> Small businesses know they should run ads, send newsletters and post
> every week — and rarely have time to write any of it. {why you built
> it, in two sentences}.
>
> Describe your business once, pick a tool, get copy in your voice in
> seconds. Free to try, no account needed: {link}
>
> I'd be grateful for your feedback — and for a share if you know
> someone who'd use it.

Publish in at least three public channels; note each post's link and
time in the daily log.

## The first 14 days

Every day, about 20 minutes, the same order:

1. **Errors** — Sentry, new issues since yesterday (production). Each
   one: a severity (below), an owner, a line in the log.
2. **Uptime** — the monitor's incidents; each one explained.
3. **Costs** — the AI spend check's result (Vercel logs,
   `ai: daily spend`), Anthropic Console → Usage, Vercel and Supabase
   usage pages; compare with the spending limits.
4. **Feedback and support** — the support inbox and the `feedback` table
   (`README.md`, "Feedback"): answer everything within 24 hours; recurring
   questions go into the FAQ (`content/faq.ts`).
5. **Numbers** — the PostHog "Launch" dashboard: visits by source,
   sign-ups, activation, subscriptions.

**Severity:**
- **P0** — people can't sign up, sign in, generate or pay; data lost or
  exposed; money taken wrongly. Fixed or rolled back **within 24 hours**
  (Vercel Instant Rollback first if the last deploy caused it;
  `docs/runbook.md`), with a line to the people affected.
- **P1** — a core feature broken for some people, with a workaround:
  within 3 days.
- **P2/P3** — the backlog, reviewed at day 14.

A fix during these two weeks is small and goes through the same CI; no
refactoring, no new features — the changelog gets an entry for anything
people would notice.

**Daily log** (a shared sheet or a doc, one row a day):

| Day | Visits → sign-ups → first result → subscribed | Errors (new / fixed) | P0 open | AI cost | Support messages | Notes |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

**Day 14:** compare with the goals, list what worked by channel, decide
what's next.
