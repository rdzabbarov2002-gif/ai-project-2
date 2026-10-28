-- Phase 5 (performance): owner policies read auth.uid() once per query,
-- not once per row.
--
-- Written as `auth.uid() = user_id`, Postgres calls auth.uid() for every
-- row it checks — on History and the Dashboard that is every generation
-- the query scans. Wrapped in a sub-select it runs once and is reused
-- (Supabase Performance Advisor, lint `auth_rls_initplan`, which flagged
-- all ten of these; docs: "Call functions with select"). Same rules, same
-- rows: supabase/tests/rls.test.sql checks them unchanged.

alter policy "users can view own row" on public.users
  using ((select auth.uid()) = id);

alter policy "users can view own company profiles" on public.company_profiles
  using ((select auth.uid()) = user_id);
alter policy "users can insert own company profiles" on public.company_profiles
  with check ((select auth.uid()) = user_id);
alter policy "users can update own company profiles" on public.company_profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "users can delete own company profiles" on public.company_profiles
  using ((select auth.uid()) = user_id);

alter policy "users can view own usage" on public.usage_counters
  using ((select auth.uid()) = user_id);

alter policy "users can view own subscription" on public.subscriptions
  using ((select auth.uid()) = user_id);

alter policy "users can view own generations" on public.generations
  using ((select auth.uid()) = user_id);
alter policy "users can insert own generations" on public.generations
  with check ((select auth.uid()) = user_id and guest_session_id is null);
alter policy "users can update own generations" on public.generations
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
