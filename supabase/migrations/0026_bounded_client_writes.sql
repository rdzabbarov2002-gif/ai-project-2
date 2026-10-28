-- Audit: what a signed-in user can write through the public API is bounded.
--
-- Every privilege a client role holds is usable directly through
-- Supabase's REST API, with the user's own session — not only through the
-- app's forms and routes, which validate what they send. Two writes were
-- unbounded that way:
--
-- 1. generations: INSERT. The server saves every generation itself, after
--    the limits and the AI call (lib/generation/save.ts, service role); a
--    direct insert skipped the limits and could add any number of rows of
--    any size. The privilege and its policy go: a user still reads their
--    own generations and changes `is_favorite`.
-- 2. company_profiles: the profile form's limits
--    (app/(auth)/profile/actions.ts; logo_url isn't written by the app)
--    become constraints, and a user holds at most 20 profiles — a safety
--    net far above what the app creates (one), not a plan limit.
--    `not valid`: existing rows aren't re-checked, every new write is.

revoke insert on public.generations from authenticated;
drop policy "users can insert own generations" on public.generations;

alter table public.company_profiles
  add constraint company_profiles_name_length
    check (char_length(name) between 1 and 200) not valid,
  add constraint company_profiles_niche_length
    check (char_length(niche) <= 200) not valid,
  add constraint company_profiles_tone_of_voice_length
    check (char_length(tone_of_voice) <= 200) not valid,
  add constraint company_profiles_target_audience_length
    check (char_length(target_audience) <= 500) not valid,
  add constraint company_profiles_usp_length
    check (char_length(usp) <= 500) not valid,
  add constraint company_profiles_website_url_length
    check (char_length(website_url) <= 300) not valid,
  add constraint company_profiles_logo_url_length
    check (char_length(logo_url) <= 2048) not valid;

create function public.limit_company_profiles_per_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.company_profiles where user_id = new.user_id) >= 20 then
    raise exception 'A user can have at most 20 company profiles.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Only ever fired by the trigger below.
revoke all on function public.limit_company_profiles_per_user() from public, anon, authenticated;

create trigger limit_per_user
  before insert on public.company_profiles
  for each row execute function public.limit_company_profiles_per_user();
