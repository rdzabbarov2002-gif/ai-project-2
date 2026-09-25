-- Plans and their limits. Created before `users` (migration 3) because
-- `users.plan_id` references `plans(id)` — reference/billing tables have
-- to exist before anything that points at them.

create table public.plans (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug in ('free', 'pro', 'enterprise')),
  name text not null,
  price_month numeric(10, 2) check (price_month is null or price_month >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.plans
  for each row execute procedure extensions.moddatetime(updated_at);

create table public.plan_limits (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null unique references public.plans(id) on delete cascade,
  -- null = unlimited, in every *_per_month / max_* column below.
  max_generations_per_month integer check (max_generations_per_month is null or max_generations_per_month >= 0),
  max_saved_results integer check (max_saved_results is null or max_saved_results >= 0),
  max_company_profiles integer default 1 check (max_company_profiles is null or max_company_profiles >= 1),
  -- "all" (jsonb string) or a jsonb array of tool/model slugs.
  allowed_tool_ids jsonb not null default '"all"'::jsonb,
  allowed_ai_models jsonb not null default '"all"'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.plan_limits
  for each row execute procedure extensions.moddatetime(updated_at);

-- Reference/pricing data — safe to expose to anyone, logged in or not
-- (a pricing page needs this before signup). No write policies: plans and
-- their limits are only ever changed by hand in the SQL editor or by a
-- future admin tool, never by application code.
alter table public.plans enable row level security;
alter table public.plan_limits enable row level security;

create policy "plans are publicly readable"
  on public.plans for select
  to anon, authenticated
  using (is_active = true);

create policy "plan_limits are publicly readable"
  on public.plan_limits for select
  to anon, authenticated
  using (true);
