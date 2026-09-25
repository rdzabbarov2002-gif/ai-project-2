-- Auto-creates the public.users (+ starter subscription) row the moment
-- Supabase Auth creates an auth.users row — i.e. right after signUp()
-- (Stage 2). Defined last, not alongside `users` in migration 0003,
-- because it writes to `public.subscriptions`, which doesn't exist until
-- migration 0007 — a plpgsql function body isn't checked against table
-- existence at CREATE time, but the trigger still shouldn't be *live*
-- before every table it touches is.
--
-- SECURITY DEFINER: runs with the privileges of the function's owner
-- (postgres), not the invoking session — required because this fires
-- inside Supabase's own auth flow, before the new user has any session
-- for RLS to key off of.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  select id into v_plan_id from public.plans where slug = 'free' limit 1;

  insert into public.users (id, email, plan_id)
  values (new.id, new.email, v_plan_id);

  -- If the free plan hasn't been seeded yet, v_plan_id is null and the
  -- user is created with no plan rather than failing signup outright —
  -- degraded, not broken. Seeding (migration 0010) always runs before any
  -- real signup in practice, but the function doesn't assume it.
  if v_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, v_plan_id, 'active');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
