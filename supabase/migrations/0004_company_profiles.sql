-- One user can hold more than one company profile (agencies managing
-- several clients — see plan_limits.max_company_profiles and the project
-- architecture doc §11 "not rushing team roles into MVP, but the schema
-- should allow it"). No uniqueness constraint on user_id: that's the
-- concrete expression of that decision.

create table public.company_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  niche text,
  tone_of_voice text,
  target_audience text,
  usp text,
  website_url text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_profiles_user_id_idx on public.company_profiles(user_id);

create trigger set_updated_at
  before update on public.company_profiles
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.company_profiles enable row level security;

-- Full CRUD scoped to the owning user — Stage 12 (Company Profile screen)
-- can read/write this directly from a Server Action or the browser client
-- without a dedicated API route; RLS is the only gate it needs.
create policy "users can view own company profiles"
  on public.company_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own company profiles"
  on public.company_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own company profiles"
  on public.company_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own company profiles"
  on public.company_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
