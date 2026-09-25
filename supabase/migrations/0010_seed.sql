-- Seed data for plans / plan_limits / tools.
--
-- Values here are copied byte-for-byte from config/plans.json and
-- config/tools.json (the pre-DB stand-ins from Stage 1/2) rather than
-- invented fresh, specifically so the two don't drift apart. Once Stage 5+
-- switches application code to querying these tables directly, those JSON
-- files stop being read at runtime — until then, both describe the same
-- numbers on purpose.
--
-- Idempotent: safe to re-run (e.g. after `supabase db reset`) via
-- ON CONFLICT upserts, so this file never needs a companion "have I
-- already seeded?" check.
--
-- No template rows yet: config/templates.json ships 16 categories but zero
-- concrete templates — real prompt_template content is Stage 10 scope.
-- Seeding placeholder templates now would mean deleting or rewriting them
-- later; better to leave the (already-created, indexed, RLS-protected)
-- table empty until there's real content for it.

insert into public.plans (slug, name, price_month, is_active)
values
  ('free', 'Free', 0, true),
  ('pro', 'Pro', 29, true),
  ('enterprise', 'Enterprise', null, true)
on conflict (slug) do update
  set name = excluded.name,
      price_month = excluded.price_month,
      is_active = excluded.is_active;

insert into public.plan_limits (
  plan_id, max_generations_per_month, max_saved_results,
  max_company_profiles, allowed_tool_ids, allowed_ai_models
)
select p.id, v.max_generations_per_month, v.max_saved_results,
       v.max_company_profiles, v.allowed_tool_ids, v.allowed_ai_models
from (
  values
    ('free', 20, 20, 1,
     '["ad-generator", "email-generator", "social-generator"]'::jsonb,
     '["claude"]'::jsonb),
    ('pro', 500, null, 3,
     '"all"'::jsonb,
     '["claude", "openai", "gemini"]'::jsonb),
    ('enterprise', null, null, null,
     '"all"'::jsonb,
     '"all"'::jsonb)
) as v(slug, max_generations_per_month, max_saved_results, max_company_profiles, allowed_tool_ids, allowed_ai_models)
join public.plans p on p.slug = v.slug
on conflict (plan_id) do update
  set max_generations_per_month = excluded.max_generations_per_month,
      max_saved_results = excluded.max_saved_results,
      max_company_profiles = excluded.max_company_profiles,
      allowed_tool_ids = excluded.allowed_tool_ids,
      allowed_ai_models = excluded.allowed_ai_models;

-- is_active = false on all three: matches config/tools.json exactly — the
-- tools exist as rows (so `generations.tool_id` and the Templates Library
-- FK have something to point at) but stay hidden from the Tools Gallery
-- until each is actually wired up (Stage 8-10), the same way the route
-- placeholders from Stage 1 are reachable but not linked from anywhere yet.
insert into public.tools (slug, name, is_active)
values
  ('ad-generator', 'AI Ad Generator', false),
  ('email-generator', 'AI Email Generator', false),
  ('social-generator', 'AI Social Media Generator', false)
on conflict (slug) do update
  set name = excluded.name,
      is_active = excluded.is_active;
