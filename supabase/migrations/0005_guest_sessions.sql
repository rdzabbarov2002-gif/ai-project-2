-- Guest sessions have no auth.uid() to key RLS off of — a guest is, by
-- definition, not authenticated. Rather than build a workaround (e.g.
-- trusting a session_token passed as a query param, which anyone could
-- guess or intercept), this table gets RLS enabled with NO policies at
-- all: that makes it default-deny for both `anon` and `authenticated`
-- roles, full stop. The only way in is the service-role key, which
-- bypasses RLS entirely and is only ever used from trusted server code
-- (Stage 5's /api/generate, Stage 11's merge logic) — never shipped to
-- the browser. This is the safest option available for unauthenticated
-- state, not a placeholder to revisit.

create table public.guest_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  session_token text not null unique,
  company_profile_draft jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- Session_token lookups (every read) and the TTL cleanup job (Stage 5+)
-- both need their own index; the unique constraint above already gives
-- session_token one for free.
create index guest_sessions_expires_at_idx on public.guest_sessions(expires_at);

create trigger set_updated_at
  before update on public.guest_sessions
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.guest_sessions enable row level security;
-- No policies — see comment above.
