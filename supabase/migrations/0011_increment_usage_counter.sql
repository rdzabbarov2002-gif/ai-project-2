-- Additive-only migration (Stage 5): one new function, no table changes.
-- Not a schema redesign — the architecture approved in Stage 3 is
-- untouched; this is the atomic-increment primitive that
-- lib/generation/save.ts needs to update usage_counters safely under
-- concurrent requests (two tabs, a client retry) without a lost update.
--
-- A select-then-update from application code has a race: two concurrent
-- requests can both read count=5, both write count=6, and one increment
-- is silently lost — exactly the kind of bug that's invisible in testing
-- and shows up as "my limit let me generate one more than it should have"
-- in production. This function does the read-modify-write as a single
-- atomic UPSERT instead.

create or replace function public.increment_usage_counter(
  p_user_id uuid,
  p_period_start date,
  p_period_end date
)
returns public.usage_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.usage_counters;
begin
  insert into public.usage_counters (user_id, period_start, period_end, generations_count)
  values (p_user_id, p_period_start, p_period_end, 1)
  on conflict (user_id, period_start)
  do update set generations_count = public.usage_counters.generations_count + 1
  returning * into v_row;

  return v_row;
end;
$$;

-- SECURITY DEFINER functions are exposed via PostgREST (and therefore
-- callable by `anon`/`authenticated` through supabase-js .rpc()) by
-- default, same as any other schema object — that would let a signed-in
-- user call this directly and increment (or fabricate) their own usage
-- row from the client, defeating the entire point of usage_counters
-- having no client write policy (migration 0007). Explicitly revoking
-- from anon/authenticated and granting only to service_role closes that
-- gap; only the admin client (lib/supabase/admin.ts) can call this.
revoke all on function public.increment_usage_counter(uuid, date, date) from public, anon, authenticated;
grant execute on function public.increment_usage_counter(uuid, date, date) to service_role;
