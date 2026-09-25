-- Usage counters and billing status. Both are trusted-write-only: no
-- INSERT/UPDATE/DELETE policy exists for `authenticated` on either table.
-- If a client could increment its own usage_counters row, plan limits
-- would be decorative. Writes happen exclusively from server code using
-- the service-role client (Stage 5 for usage_counters on every
-- generation, a future Stripe webhook for subscriptions) — SELECT is
-- still open to the owning user so a usage indicator / billing page can
-- read this directly without a dedicated API route.

create table public.usage_counters (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  generations_count integer not null default 0 check (generations_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_counters_period_valid check (period_end > period_start),
  constraint usage_counters_user_period_unique unique (user_id, period_start)
);

create index usage_counters_user_id_idx on public.usage_counters(user_id);

create trigger set_updated_at
  before update on public.usage_counters
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.usage_counters enable row level security;

create policy "users can view own usage"
  on public.usage_counters for select
  to authenticated
  using (auth.uid() = user_id);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider_ref text,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_status_idx on public.subscriptions(status);

create trigger set_updated_at
  before update on public.subscriptions
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.subscriptions enable row level security;

create policy "users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);
