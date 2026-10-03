-- Deleting an account (app/(auth)/settings/billing/actions.ts deletes the
-- Auth user) leaves no row of that user anywhere in `public`.
-- Run: `npx supabase test db`.

begin;
select plan(8);

insert into auth.users (id, email)
values ('dddddddd-0000-4000-8000-000000000001', 'delete-me@rls.test');

insert into public.company_profiles (user_id, name)
values ('dddddddd-0000-4000-8000-000000000001', 'Doomed Co');

insert into public.generations (user_id, tool_id, ai_provider, ai_model)
select 'dddddddd-0000-4000-8000-000000000001', id, 'claude', 'test'
from public.tools order by slug limit 1;

insert into public.usage_counters (user_id, period_start, period_end, generations_count)
values ('dddddddd-0000-4000-8000-000000000001', '2026-01-01', '2026-02-01', 1);

insert into public.feedback (user_id, message)
values ('dddddddd-0000-4000-8000-000000000001', 'Bye');

insert into public.billing_customers (user_id, stripe_customer_id)
values ('dddddddd-0000-4000-8000-000000000001', 'cus_delete_me');

-- The signup trigger (0009) already created the users and subscriptions rows.
delete from auth.users where id = 'dddddddd-0000-4000-8000-000000000001';

select is((select count(*)::int from public.users
  where id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'users row is gone');
select is((select count(*)::int from public.company_profiles
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'company profiles are gone');
select is((select count(*)::int from public.generations
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'generations are gone');
select is((select count(*)::int from public.usage_counters
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'usage counters are gone');
select is((select count(*)::int from public.subscriptions
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'subscriptions are gone');
select is((select count(*)::int from public.feedback
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'feedback is gone');
select is((select count(*)::int from public.billing_customers
  where user_id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'the Stripe customer link is gone');
select is((select count(*)::int from auth.users
  where id = 'dddddddd-0000-4000-8000-000000000001'), 0, 'the auth user is gone');

select * from finish();
rollback;
