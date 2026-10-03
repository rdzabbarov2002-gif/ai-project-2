-- Phase 6 (payments, Stripe). A user's plan comes from one place: their
-- subscription rows. Only the server writes them — the Stripe webhook
-- (app/api/stripe/webhook) and the nightly reconciliation
-- (app/api/cron/reconcile-subscriptions), both re-reading the
-- subscription from Stripe — and the plan in force is the best one among
-- the rows that are `active` or `trialing` (lib/generation/plan.ts). The
-- Free row every account gets at sign-up (migration 0009) stays as the
-- floor: a canceled, unpaid or past-due paid subscription leaves Free.

-- Stripe's own subscription statuses, and what the billing page shows.
alter table public.subscriptions drop constraint subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid',
                    'incomplete', 'incomplete_expired', 'paused'));
alter table public.subscriptions
  add column cancel_at_period_end boolean not null default false,
  add column trial_end timestamptz;
-- provider_ref is Stripe's subscription id: one row per subscription,
-- upserted by it. The Free rows have none (unique allows many nulls).
alter table public.subscriptions
  add constraint subscriptions_provider_ref_key unique (provider_ref);

-- users.plan_id was the plan before subscriptions were real, and would
-- now be a second, stale answer to "which plan is this user on".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  insert into public.users (id, email) values (new.id, new.email);

  select id into v_plan_id from public.plans where slug = 'free' limit 1;
  if v_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, v_plan_id, 'active');
  end if;

  return new;
end;
$$;

alter table public.users drop column plan_id;

-- Which Stripe customer is which user: created at the first checkout,
-- reused for every later one and for the Customer Portal.
create table public.billing_customers (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

-- Webhook events already handled, by Stripe's event id: a redelivered
-- event is acknowledged without being applied again.
create table public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

-- One row per nightly reconciliation run: how many subscriptions were
-- compared with Stripe and how many had to be corrected.
create table public.billing_reconciliations (
  id uuid primary key default extensions.gen_random_uuid(),
  checked integer not null,
  fixed integer not null,
  created_at timestamptz not null default now()
);

-- Server only, like feedback (migration 0022): no client privileges,
-- no policies.
alter table public.billing_customers enable row level security;
alter table public.stripe_events enable row level security;
alter table public.billing_reconciliations enable row level security;
revoke all on table public.billing_customers, public.stripe_events, public.billing_reconciliations
  from anon, authenticated;
