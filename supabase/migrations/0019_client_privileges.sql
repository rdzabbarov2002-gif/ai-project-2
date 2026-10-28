-- Phase 2 (database): client roles keep only the privileges the app uses.
--
-- Supabase grants `anon` and `authenticated` every privilege on every
-- table in `public`; RLS then filters rows. That left three real gaps:
--
-- 1. `generations`: the owner could rewrite any column of their own rows
--    through the public API — output, tool, created_at (backdating rows
--    defeats the per-minute rate limit, lib/limits/rateLimit.ts). The app
--    only ever changes `is_favorite` from a user session
--    (app/(auth)/history/actions.ts).
-- 2. `generations` INSERT accepted any `guest_session_id`: a signed-in user
--    who knew a guest session's id could spend that guest's free allowance
--    (lib/limits/checkUsage.ts counts guest generations by that column).
--    Rows saved for a signed-in user never carry one (lib/generation/save.ts).
-- 3. Writes to server-only tables (plans, plan_limits, tools, templates,
--    usage_counters, subscriptions, guest_sessions) were only filtered by
--    RLS — an UPDATE or DELETE "succeeded" on zero rows instead of being
--    refused — and TRUNCATE, which RLS doesn't apply to, was still granted.
--
-- Server code uses the service role and is unaffected. The matrix below
-- is exactly what the application's user-session queries need; RLS
-- policies still decide which rows.

revoke all on table
  public.plans,
  public.plan_limits,
  public.tools,
  public.templates,
  public.users,
  public.company_profiles,
  public.guest_sessions,
  public.usage_counters,
  public.subscriptions,
  public.generations
from anon, authenticated;

-- Reference data: pricing, Tools Gallery, Templates Library — public.
grant select on public.plans, public.plan_limits, public.tools, public.templates
  to anon, authenticated;

-- A user's own account, usage and subscription: read-only.
grant select on public.users, public.usage_counters, public.subscriptions
  to authenticated;

-- Company profile: fully managed by its owner (app/(auth)/profile/actions.ts).
grant select, insert, update, delete on public.company_profiles to authenticated;

-- Generations: read and save own (lib/generation/save.ts); the only column
-- a user may change afterwards is the favorite flag.
grant select, insert on public.generations to authenticated;
grant update (is_favorite) on public.generations to authenticated;

-- guest_sessions: nothing — server only (migration 0005).

drop policy "users can insert own generations" on public.generations;

create policy "users can insert own generations"
  on public.generations for insert
  to authenticated
  with check (auth.uid() = user_id and guest_session_id is null);

-- A trigger function (migration 0009) — never meant to be called directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
