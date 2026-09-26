-- Row level security and client privileges, every table in `public`.
-- Run: `npx supabase test db` (local database), and in CI.
--
-- Two users (A, B) and one guest are created inside the transaction and
-- rolled back at the end. Queries run as the roles PostgREST uses:
-- `anon`, and `authenticated` with A's JWT claims.

begin;
select plan(43);

-- ---------------------------------------------------------------- setup
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@rls.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@rls.test');

insert into public.company_profiles (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'aaaaaaaa-0000-4000-8000-000000000001', 'A Co'),
  ('bbbbbbbb-0000-4000-8000-0000000000c2', 'bbbbbbbb-0000-4000-8000-000000000002', 'B Co');

insert into public.guest_sessions (id, session_token, expires_at) values
  ('eeeeeeee-0000-4000-8000-0000000000e1', 'rls-test-guest-token', now() + interval '1 day');

insert into public.generations (id, user_id, guest_session_id, tool_id, ai_provider, ai_model)
select g.id, g.user_id, g.guest_session_id, t.id, 'claude', 'test'
from (values
  ('aaaaaaaa-0000-4000-8000-0000000000a1'::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, null::uuid),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'bbbbbbbb-0000-4000-8000-000000000002', null),
  ('eeeeeeee-0000-4000-8000-0000000000f1', null, 'eeeeeeee-0000-4000-8000-0000000000e1')
) as g(id, user_id, guest_session_id)
cross join (select id from public.tools order by slug limit 1) t;

insert into public.usage_counters (user_id, period_start, period_end, generations_count) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '2026-01-01', '2026-02-01', 1),
  ('bbbbbbbb-0000-4000-8000-000000000002', '2026-01-01', '2026-02-01', 1);

-- ------------------------------------------------------------ structure
select is(
  array(
    select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ),
  '{}'::text[],
  'every table in public has row level security enabled'
);

-- Exactly the privileges the app's user-session queries need (migration
-- 0019). A new table fails this until its client grants are decided.
select is(
  array(
    select format('%s %s %s', grantee, table_name, privilege_type)
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    order by 1
  ),
  array[
    'anon plan_limits SELECT',
    'anon plans SELECT',
    'anon templates SELECT',
    'anon tools SELECT',
    'authenticated company_profiles DELETE',
    'authenticated company_profiles INSERT',
    'authenticated company_profiles SELECT',
    'authenticated company_profiles UPDATE',
    'authenticated generations INSERT',
    'authenticated generations SELECT',
    'authenticated plan_limits SELECT',
    'authenticated plans SELECT',
    'authenticated subscriptions SELECT',
    'authenticated templates SELECT',
    'authenticated tools SELECT',
    'authenticated usage_counters SELECT',
    'authenticated users SELECT'
  ],
  'client roles hold only the table privileges the app uses'
);

select is(
  array(
    select column_name::text from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'generations'
      and grantee = 'authenticated' and privilege_type = 'UPDATE'
  ),
  array['is_favorite'],
  'the only generations column a user may update is is_favorite'
);

select ok(
  not has_function_privilege('anon', 'public.increment_usage_counter(uuid, date, date)', 'execute')
  and not has_function_privilege('authenticated', 'public.increment_usage_counter(uuid, date, date)', 'execute')
  and not has_function_privilege('anon', 'public.handle_new_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'clients cannot execute the usage counter or the signup trigger function'
);

-- ----------------------------------------------------------------- anon
set local role anon;

select isnt_empty('select 1 from public.tools', 'anon reads the tools gallery');
select isnt_empty('select 1 from public.templates', 'anon reads the templates library');
select isnt_empty('select 1 from public.plans join public.plan_limits on plan_limits.plan_id = plans.id',
  'anon reads plans and their limits');

select throws_ok('select 1 from public.users', '42501', null, 'anon cannot read users');
select throws_ok('select 1 from public.company_profiles', '42501', null, 'anon cannot read company_profiles');
select throws_ok('select 1 from public.generations', '42501', null, 'anon cannot read generations');
select throws_ok('select 1 from public.guest_sessions', '42501', null, 'anon cannot read guest_sessions');
select throws_ok('select 1 from public.usage_counters', '42501', null, 'anon cannot read usage_counters');
select throws_ok('select 1 from public.subscriptions', '42501', null, 'anon cannot read subscriptions');
select throws_ok('select 1 from public.feedback', '42501', null, 'anon cannot read feedback');
select throws_ok('update public.plans set name = name', '42501', null, 'anon cannot change plans');

reset role;

-- ------------------------------------------------- authenticated as A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

-- users
select results_eq('select id from public.users',
  $$ values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$, 'A sees only their own users row');
select throws_ok('update public.users set plan_id = null', '42501', null,
  'A cannot change their own plan');

-- company_profiles
select results_eq('select name from public.company_profiles', $$ values ('A Co') $$,
  'A sees only their own company profile');
-- Checked after `reset role`, below: A's edit lands, B's row is untouched.
update public.company_profiles set name = 'A Co 2' where id = 'aaaaaaaa-0000-4000-8000-0000000000c1';
update public.company_profiles set name = 'taken' where id = 'bbbbbbbb-0000-4000-8000-0000000000c2';
delete from public.company_profiles where id = 'bbbbbbbb-0000-4000-8000-0000000000c2';
select throws_ok(
  $$ insert into public.company_profiles (user_id, name)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'fake') $$,
  '42501', null, 'A cannot create a company profile for B');

-- generations
select results_eq('select id from public.generations',
  $$ values ('aaaaaaaa-0000-4000-8000-0000000000a1'::uuid) $$,
  'A sees only their own generations (not B''s, not the guest''s)');
select lives_ok(
  $$ insert into public.generations (user_id, tool_id, ai_provider, ai_model)
     select 'aaaaaaaa-0000-4000-8000-000000000001', id, 'claude', 'test'
     from public.tools order by slug limit 1 $$,
  'A can save a generation of their own');
select throws_ok(
  $$ insert into public.generations (user_id, tool_id, ai_provider, ai_model)
     select 'bbbbbbbb-0000-4000-8000-000000000002', id, 'claude', 'test'
     from public.tools order by slug limit 1 $$,
  '42501', null, 'A cannot save a generation as B');
select throws_ok(
  $$ insert into public.generations (user_id, guest_session_id, tool_id, ai_provider, ai_model)
     select 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-0000000000e1',
            id, 'claude', 'test'
     from public.tools order by slug limit 1 $$,
  '42501', null, 'A cannot attach a generation to a guest session');
-- Checked after `reset role`: only A's own row changes.
update public.generations set is_favorite = true
where id in ('aaaaaaaa-0000-4000-8000-0000000000a1', 'bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok('update public.generations set output = ''x''', '42501', null,
  'A cannot rewrite a generation''s output');
select throws_ok('update public.generations set created_at = now() - interval ''1 day''', '42501', null,
  'A cannot backdate a generation');
select throws_ok('delete from public.generations', '42501', null, 'A cannot delete generations');

-- usage_counters
select is((select count(*)::int from public.usage_counters), 1, 'A sees only their own usage counter');
select throws_ok('update public.usage_counters set generations_count = 0', '42501', null,
  'A cannot reset their usage counter');
select throws_ok(
  $$ select public.increment_usage_counter('aaaaaaaa-0000-4000-8000-000000000001', '2026-01-01', '2026-02-01') $$,
  '42501', null, 'A cannot call the usage counter RPC');

-- subscriptions
select results_eq('select user_id from public.subscriptions',
  $$ values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$, 'A sees only their own subscription');
select throws_ok('update public.subscriptions set status = ''active''', '42501', null,
  'A cannot change their subscription');

-- guest_sessions
select throws_ok('select 1 from public.guest_sessions', '42501', null, 'A cannot read guest_sessions');

-- feedback: server only (migration 0022) — not even one's own
select throws_ok('select 1 from public.feedback', '42501', null, 'A cannot read feedback');
select throws_ok(
  $$ insert into public.feedback (user_id, message)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'hi') $$,
  '42501', null, 'A cannot write feedback directly');

-- reference data: read-only
select isnt_empty('select 1 from public.tools', 'A reads the tools gallery');
select throws_ok('update public.plans set price_month = 0', '42501', null, 'A cannot change plans');
select throws_ok('update public.plan_limits set max_generations_per_month = null', '42501', null,
  'A cannot change plan limits');
select throws_ok('update public.tools set is_active = true', '42501', null, 'A cannot change tools');
select throws_ok('update public.templates set is_premium = false', '42501', null,
  'A cannot change templates');

reset role;

-- --------------------------------------- effects of A's writes, as admin
select is(
  (select name from public.company_profiles where id = 'aaaaaaaa-0000-4000-8000-0000000000c1'),
  'A Co 2', 'A can edit their own company profile');
select is(
  (select name from public.company_profiles where id = 'bbbbbbbb-0000-4000-8000-0000000000c2'),
  'B Co', 'A can neither edit nor delete B''s company profile');
select is(
  (select is_favorite from public.generations where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  true, 'A can favorite their own generation');
select is(
  (select is_favorite from public.generations where id = 'bbbbbbbb-0000-4000-8000-0000000000b1'),
  false, 'A cannot favorite B''s generation');

select * from finish();
rollback;
