# Payments (Stripe)

Money is taken by Stripe; what an account may do comes from the
subscription as Stripe reports it. The app never decides on its own that
someone has paid.

## How it works

1. **Buying.** Billing & Plan or `/pricing` → "Start 14-day free trial"
   (or "Upgrade to Pro" after a first subscription) → Stripe Checkout.
   The first subscription gets a 14-day trial; a card is taken at the start
   and charged when the trial ends. Stripe Tax adds tax for the customer's
   address. (`app/(auth)/settings/billing/actions.ts`)
2. **The webhook** (`/api/stripe/webhook`) is the only writer of
   subscription state. It checks Stripe's signature (wrong → 400), skips
   events it has already handled (`stripe_events`), and for each event
   fetches the subscription from Stripe and stores that — so events
   arriving late or out of order can't move a subscription backwards.
3. **Access** is the best plan among the account's subscriptions that
   are `active` or `trialing` (`lib/generation/plan.ts`); everyone keeps a
   Free row underneath. Clients can read their own subscription rows and
   can't write them (`supabase/tests/rls.test.sql`).
4. **Everything after buying** — plan changes, card updates, cancelling,
   invoices — is Stripe's Customer Portal ("Manage billing"). Failed
   payments are retried by Stripe (Smart Retries) and Stripe emails the
   customer.
5. **Every night** (03:30 UTC, `vercel.json`)
   `/api/cron/reconcile-subscriptions` compares every Stripe subscription
   with ours and corrects differences; each run is a row in
   `billing_reconciliations`.
6. **Deleting an account** deletes the Stripe customer first, which ends
   the subscription at once.

| Stripe status | What the account gets |
|---|---|
| `trialing`, `active` | the subscription's plan (also when set to cancel at period end — until it ends) |
| `past_due`, `unpaid` (a payment failed) | Free, until the card is updated and the payment goes through |
| `canceled`, `incomplete`, `incomplete_expired`, `paused` | Free |

A price's plan comes from its lookup key: `pro_monthly` → Pro. A price
whose key starts with `enterprise_` gives Enterprise — for a custom deal,
create such a price for that customer in the Dashboard.

## Setting up (test mode first)

1. A Stripe account; in **test mode** copy the secret key (`sk_test_…`).
2. `STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-setup.mjs` — creates
   the Pro product and its $29/month price (`pro_monthly`, tax added on
   top). Running it again changes nothing.
3. In the Dashboard (test mode):
   - **Tax:** activate Stripe Tax — your origin address, and where you're
     registered to collect tax. Checkout fails until it's active.
   - **Settings → Billing → Customer portal:** allow cancelling (at the
     end of the period), updating the payment method, invoice history;
     save.
   - **Settings → Billing → Subscriptions and emails:** Smart Retries on;
     emails for failed payments and for trials about to end on; after all
     retries fail, cancel the subscription.
4. Webhook while developing locally: install the Stripe CLI and run
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`; it
   prints a signing secret (`whsec_…`).
5. `.env.local`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `CRON_SECRET` (any long random string). The server won't start with
   the secret key but no webhook secret.

For a deployed environment, create the endpoint with the script instead:
`node scripts/stripe-setup.mjs --webhook https://<domain>/api/stripe/webhook`
prints its `STRIPE_WEBHOOK_SECRET`. Set the three variables in Vercel for
that environment.

## The scenarios, in test mode

The end-to-end tests run all of these against a local stand-in for
Stripe on every CI run (`e2e/billing.spec.ts`). Once, with the real test
mode, go through them by hand; test cards: `4242 4242 4242 4242` (pays),
`4000 0000 0000 0341` (is accepted, then every charge is declined).

| Scenario | How | Expected in Billing & Plan |
|---|---|---|
| Subscribe | Start the free trial, pay with 4242 | Plan: Pro; "Pro free trial until …" |
| Trial → payment | Dashboard → the subscription → end the trial now (or `stripe subscriptions update <sub> --trial-end=now`) | "Pro, renews on …"; a paid invoice |
| Trial → cancel | Manage billing → cancel during the trial | "It ends then — you won't be charged"; after the trial: Free |
| Plan up and down | Create a test price `enterprise_monthly` on a product, allow switching in the portal; switch there and back | Plan: Enterprise, then Pro |
| Card declined | Subscribe with 4000 0000 0000 0341, end the trial | "Your last payment for Pro failed"; Plan: Free; Pro templates locked; after updating the card: Pro |
| Cancel at period end | Manage billing → cancel | "Pro until … It won't renew"; at the end: Free |
| Refund | Dashboard → Payments → refund, and cancel the subscription | Free; the refund in the invoice history |

Check the webhook deliveries in the Dashboard (Developers → Webhooks):
every event should have answered 200.

## Going live

1. Activate the account (business details, bank account).
2. `STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-setup.mjs --webhook https://<domain>/api/stripe/webhook`
3. The Dashboard steps from "Setting up", in live mode.
4. Vercel → Production: the live `STRIPE_SECRET_KEY` and
   `STRIPE_WEBHOOK_SECRET`, and `CRON_SECRET`; redeploy.
5. Subscribe with your own card; then refund yourself in the Dashboard
   and cancel. Both show up in Billing & Plan.

## Nightly reconciliation

Three nights in a row without differences is the sign the webhook is
reliable:

```sql
select created_at, checked, fixed from public.billing_reconciliations
order by created_at desc limit 3;
```

A run with `fixed > 0` is also logged as an error (Sentry), with the
subscriptions it corrected. The usual cause is a webhook Stripe couldn't
deliver: Developers → Webhooks shows the failures and can resend them.

## Margins

AI cost per generation, at Claude Sonnet 5's $2 / $10 per million input /
output tokens (Phase 4, README → Cost and speed of generations):

- **Worst case, a hard ceiling:** output is capped at 8,192 tokens and
  the form fields limit the input to about 3,000 tokens — $0.006 + $0.082
  ≈ **$0.09**.
- **Typical, an estimate until there's real data:** a short ad, email or
  post, about 1,500 tokens in and 1,500 out (with the model's thinking) —
  ≈ **$0.02**; a long article, 2,000 in and 6,000 out — ≈ $0.06.

Stripe's fees on $29 (standard US pricing — check stripe.com/pricing):
card 2.9% + $0.30 = $1.14, Billing 0.7% = $0.20, Tax 0.5% = $0.15 where
collected — about **$27.50 left**.

| Plan | Price | AI cost per user per month | Margin |
|---|---|---|---|
| Free (20 generations) | $0 | $0.40 typical, $1.80 at most | −$0.40 to −$1.80: the cost of a free user |
| Pro, 100 generations used | $29 | $2 typical | ≈ $25.50 (88%) |
| Pro, all 500 used, typical mix | $29 | ≈ $10–14 | ≈ $13–17 (47–60%) |
| Pro, all 500 used, all at the ceiling | $29 | $45 | **≈ −$17.50: a loss** |
| Pro trial, 14 days | $0 | up to $45 at the ceiling | the cost of a trial; one per person, card required |
| Enterprise | custom | $0.02–0.09 per generation | price per 1,000 generations at ≥ $90 to be safe at the ceiling |

So Pro is profitable for anyone who doesn't use the whole allowance on
long pieces. The exposure is a small group generating 500 long articles a
month. Whether to act on it — a lower limit for long-form templates, or a
higher price — is the owner's call after the beta, with real numbers. With
live data, the AI cost per paying user over the last 30 days:

```sql
select s.user_id, count(g.id) as generations,
  round(sum(g.input_tokens * 2 + g.output_tokens * 10) / 1000000.0, 2) as ai_cost_usd
from public.subscriptions s
join public.generations g on g.user_id = s.user_id and g.created_at > now() - interval '30 days'
where s.provider_ref is not null and s.status in ('active', 'trialing')
group by s.user_id
order by ai_cost_usd desc;
```
