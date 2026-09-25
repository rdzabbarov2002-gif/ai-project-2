-- The core event table every AI tool writes to. Owned by exactly one of
-- `user_id` / `guest_session_id` (enforced below), which is what makes
-- the guest→user merge (Stage 11) a metadata UPDATE rather than a data
-- copy: flipping guest_session_id to null and setting user_id on existing
-- rows is enough, nothing needs to move.

create table public.generations (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  guest_session_id uuid references public.guest_sessions(id) on delete cascade,
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  tool_id uuid not null references public.tools(id),
  template_id uuid references public.templates(id) on delete set null,
  ai_provider text not null,
  ai_model text not null,
  input_params jsonb not null default '{}'::jsonb,
  output text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generations_owner_required
    check (user_id is not null or guest_session_id is not null)
);

-- History screen (Stage 11) paginates a single user's rows newest-first —
-- this is the index that query actually needs.
create index generations_user_id_created_at_idx
  on public.generations(user_id, created_at desc);
create index generations_guest_session_id_idx on public.generations(guest_session_id);
create index generations_tool_id_idx on public.generations(tool_id);

create trigger set_updated_at
  before update on public.generations
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.generations enable row level security;

-- Scoped to the owning user. This is what lets Stage 5's /api/generate use
-- the caller's own session-bound Supabase client (RLS-enforced) for
-- signed-in requests instead of the service-role key — the privileged
-- client is reserved for guest requests, which have no auth.uid() to
-- scope a policy to (same reasoning as guest_sessions, migration 0005).
create policy "users can view own generations"
  on public.generations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own generations"
  on public.generations for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Scoped update, not just for "is_favorite": a client toggling one field
-- on its own row is a normal, safe operation under RLS, and adding this
-- now means Stage 11 (History screen, favorites) needs no new policy.
create policy "users can update own generations"
  on public.generations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
