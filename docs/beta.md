# Closed beta

Ten to twenty people from outside the team use the product for two weeks.
It answers three questions: do people get to a first result quickly, do
they come back, and would they pay — the go/no-go for monetization
(`docs/decisions.md`, §6).

## Targets

| What | Target | Where it comes from |
|---|---|---|
| People who signed up (not you) | ≥ 10 | query below |
| Activation — signed up and made at least one result | ≥ 40% | query below |
| Median time from sign-up to the first result | ≤ 3 min | query below (and the PostHog funnel) |
| People who sent feedback | ≥ 5 | query below |
| Open P0/P1 bugs at the end | 0 | your bug list |
| Error events per generation | < 1% | Sentry ÷ query below |

## Before the first invite

- [ ] The production Supabase project is on Pro, its latest backup is
      less than 24 hours old, and the restore drill is done and logged
      (`docs/backup-restore.md`).
- [ ] Email works for strangers: your own SMTP provider with SPF, DKIM
      and DMARC (README → Authentication settings). Supabase's built-in
      sender only delivers to your team's addresses — without this, beta
      users never get their confirmation email.
- [ ] Site URL and redirect URLs point at the production domain.
- [ ] `NEXT_PUBLIC_SENTRY_DSN` and `POSTHOG_KEY` are set in Vercel
      (Production) — errors and the funnel are what you'll measure with.
- [ ] A monthly spending limit is set in the Anthropic console.
- [ ] Privacy Policy and Terms are reviewed and every `[placeholder]` is
      filled in (company name, contact email, retention period, email
      provider).
- [ ] You ran the whole path on production with a fresh address: sign up
      → confirm → onboarding → a result → History → feedback → delete the
      account.

## Inviting

Invite about twenty to get ten who really use it: people who run or market
a small business — not friends who'll be polite. Keep who you invited, and
when, in a private note (not in this repository). Something like:

> I'm building a tool that writes ads, emails and social posts for small
> businesses from a short description of the business. Could you try it
> for a couple of weeks and tell me what's confusing or missing? It's
> free during the beta: <link>. The "Send feedback" link at the bottom of
> every page reaches me directly.

Write down the date of the first invite — the queries below start there.

## During the two weeks

- **Daily (five minutes):** new issues in Sentry; new feedback (README →
  Operations → Feedback); sign-ups and generations in PostHog.
- **Bugs:** P0 — data lost or exposed, or nobody can sign in or generate:
  fix the same day. P1 — a main flow broken for some people: within two
  days. The rest go to the list for later.
- **Weekly:** the backup is under 24 hours old; run the numbers below.

## The numbers

In the Supabase SQL Editor, with the date of the first invite and your own
accounts filled in:

```sql
with params as (
  select timestamptz '2026-10-01' as beta_start,        -- the day the first invites went out
         array['you@example.com']::text[] as team       -- your own accounts, left out
),
beta_users as (
  select u.id, u.created_at
  from auth.users u, params p
  where u.created_at >= p.beta_start and u.email <> all (p.team)
),
per_user as (
  select b.id,
         b.created_at as signed_up_at,
         min(g.created_at) as first_result_at,
         count(distinct g.created_at::date) as active_days
  from beta_users b left join public.generations g on g.user_id = b.id
  group by b.id, b.created_at
)
select
  count(*) as signed_up,
  count(first_result_at) as activated,
  round(100.0 * count(first_result_at) / nullif(count(*), 0)) as activation_pct,
  -- A guest's results move to the account at sign-up and can predate it: 0.
  percentile_cont(0.5) within group
    (order by greatest(first_result_at - signed_up_at, interval '0'))
    filter (where first_result_at is not null) as median_signup_to_first_result,
  count(*) filter (where active_days >= 2) as came_back_another_day,
  (select count(distinct f.user_id) from public.feedback f join beta_users b on b.id = f.user_id) as gave_feedback
from per_user;
```

The time to a first result includes confirming the email. PostHog shows
the same funnel: a Funnel insight with the steps `signed_up` →
`generation_completed`; its "Time to convert" view has the median.

**Errors.** Sentry records errors only, and nothing that identifies a
person (`lib/sentry.ts`), so it can't count sessions or affected users.
Use events per generation instead: the number of error events in Sentry
for the period, divided by

```sql
select count(*) from public.generations where created_at >= timestamptz '2026-10-01';
```

— under 1%. Look at every new issue anyway; one broken sign-up matters
more than the ratio.

## After two weeks: go or no-go

Write the result into `docs/decisions.md`, §6: the numbers above, the
three things people said most often, what a generation costs you (README
→ Operations → Cost and speed of generations) against the price you have
in mind, and the decision with its reason.

A reasonable rule: **go** to Phase 6 (payments) if the targets are met
and at least some testers say they'd pay or keep using it; otherwise fix
what the feedback points at — usually onboarding or the quality of the
results — and run a shorter second round.
