-- Mirrors auth.users 1:1. Supabase's own auth.users table is in a
-- protected schema the client can't query under RLS in a useful way, and
-- we need a place to hang app-specific columns (plan_id) and a stable
-- `public` row for every FK in the rest of the schema to point at.
--
-- Populated by a trigger on auth.users (migration 0009, after every table
-- it touches — plans and subscriptions — exists), not here.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_plan_id_idx on public.users(plan_id);

create trigger set_updated_at
  before update on public.users
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.users enable row level security;

-- A user can see and edit their own row only. There is deliberately no
-- INSERT policy — rows are created exclusively by the `handle_new_user`
-- trigger (SECURITY DEFINER, migration 0009), never by client code, so a
-- signed-in user can never insert an arbitrary row for another id.
create policy "users can view own row"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "users can update own row"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
