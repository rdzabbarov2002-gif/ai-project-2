-- Stage 15 (security): a signed-in user could change their own plan.
--
-- Migration 0003 gave `public.users` an owner-scoped UPDATE policy ("users
-- can update own row"). That row holds `plan_id`, so any signed-in user
-- could send `update users set plan_id = <enterprise>` through the public
-- API with their own session and grant themselves unlimited generations
-- and premium templates — found by the Stage 15 security pass against a
-- real Supabase stack. Nothing in the application writes this table from
-- a client (the signup trigger, migration 0009, is SECURITY DEFINER; plan
-- changes will come from the billing integration through the service
-- role), so the policy has no legitimate user.
--
-- Dropping the policy already makes client updates match no rows under
-- RLS; revoking the privilege as well turns an attempt into an explicit
-- permission error and keeps it closed even if a policy is re-added
-- carelessly later. Reads are unchanged ("users can view own row").

drop policy if exists "users can update own row" on public.users;

revoke update on public.users from anon, authenticated;
