-- Phase 5: in-app feedback (app/(auth)/feedback). What signed-in people
-- write to us, read by the team with SQL (README.md → "Closed beta").
--
-- Server only, like guest_sessions: the page's server action checks the
-- user, validates the message and inserts with the service role, so
-- clients hold no privileges here and there is no policy to get wrong.
-- Deleting an account deletes its feedback (Privacy Policy).

create table public.feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Covers the foreign key and the per-user rate limit's lookup
-- (app/(auth)/feedback/actions.ts).
create index feedback_user_id_created_at_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon, authenticated;
