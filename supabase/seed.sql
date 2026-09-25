-- ============================================================
-- AI Marketing Workspace — seed data (through Stage 9)
-- Generated from migrations/0010, 0013, 0014, 0015. Run AFTER schema.sql.
-- Safe to re-run any time (idempotent).
-- ============================================================

-- ---------- migrations/0010_seed.sql ----------
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

-- ---------- migrations/0013_tools_gallery_seed_update.sql ----------
-- Backfills description/icon/category (migration 0012) onto the three
-- tools seeded in migration 0010. Idempotent UPDATE, not a rewrite of the
-- original seed INSERT — 0010 already ran; this only sets the new columns
-- on the rows it created. Values are functional placeholders (accurate,
-- minimal) — real per-tool copy is Stage 8-10 scope same as it always
-- was; this migration exists only so the Gallery has something real to
-- render against these three (still `is_active = false`, unchanged) rows
-- rather than every field being empty.

update public.tools set
  description = 'Generate ready-to-run ad copy for your campaigns.',
  icon = '📣',
  category = 'Ads'
where slug = 'ad-generator';

update public.tools set
  description = 'Draft marketing emails tailored to your audience.',
  icon = '✉️',
  category = 'Email'
where slug = 'email-generator';

update public.tools set
  description = 'Create on-brand posts for your social channels.',
  icon = '📱',
  category = 'Social'
where slug = 'social-generator';

-- ---------- migrations/0014_ad_generator_activation.sql ----------
-- Stage 8: the first real tool. Activates `ad-generator` (seeded inactive
-- in migration 0010, category/description/icon added in 0013) with a
-- real `config_schema` (format defined in Stage 6,
-- lib/tool-config/schema.ts) and a real default template — the first
-- content this project ships, not scaffold.
--
-- Pure data (UPDATE + INSERT), no ALTER TABLE: Stage 3/6/7's schema
-- already had everywhere this needed to write to
-- (tools.config_schema jsonb, templates.prompt_template/required_fields)
-- — worth noting as evidence that schema, not a gap this stage had to
-- patch.
--
-- Four fields, chosen for what an ad actually needs to be generated
-- (platform, what's being advertised, an optional offer, a call to
-- action) — not a UI/UX layout decision, a data requirement: the prompt
-- template below literally can't produce a usable ad without knowing
-- these. No fifth field ("tone") was added: the company profile already
-- carries tone_of_voice into every prompt (lib/generation/prompt.ts,
-- Stage 5) — a second, per-generation tone control would be redundant
-- with data the pipeline already uses, not a missing feature.

update public.tools
set
  is_active = true,
  config_schema = $json$
{
  "fields": [
    {
      "type": "select",
      "name": "platform",
      "label": "Platform",
      "required": true,
      "options": [
        { "label": "Facebook", "value": "Facebook" },
        { "label": "Instagram", "value": "Instagram" },
        { "label": "Google Search", "value": "Google Search" },
        { "label": "LinkedIn", "value": "LinkedIn" },
        { "label": "X (Twitter)", "value": "X (Twitter)" }
      ]
    },
    {
      "type": "text",
      "name": "productOrService",
      "label": "Product or service being advertised",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "offerDetails",
      "label": "Offer or promotion details",
      "helpText": "Optional — e.g. a discount, launch, or limited-time deal.",
      "required": false,
      "maxLength": 500,
      "rows": 3
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Call to action",
      "required": true,
      "options": [
        { "label": "Shop Now", "value": "Shop Now" },
        { "label": "Learn More", "value": "Learn More" },
        { "label": "Sign Up", "value": "Sign Up" },
        { "label": "Get Started", "value": "Get Started" },
        { "label": "Contact Us", "value": "Contact Us" }
      ]
    }
  ]
}
$json$::jsonb
where slug = 'ad-generator';

-- One default template. `category` here is 'General' rather than a
-- platform name (e.g. 'Facebook Ads') because `platform` is a field
-- *within* this template, not a separate template per platform — it
-- adapts to whichever platform the user picks, so it doesn't belong to
-- one of the 16 platform-specific categories config/templates.json lists
-- for the future Templates Library (Stage 10). Platform-specific
-- templates, if wanted, are additional rows Stage 10 can add without
-- touching this one.
insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium)
select
  id,
  'ad-generator-default',
  'Standard Ad',
  'General',
  $prompt$Write a single, ready-to-publish ad for {{platform}}.

Product or service: {{productOrService}}
Offer or promotion: {{offerDetails}}
Call to action: {{callToAction}}

Follow {{platform}}'s typical ad copy length and conventions. Output only the ad copy itself — no explanations, no headers, no surrounding quotation marks.$prompt$,
  '["platform", "productOrService", "callToAction"]'::jsonb,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set
    tool_id = excluded.tool_id,
    name = excluded.name,
    category = excluded.category,
    prompt_template = excluded.prompt_template,
    required_fields = excluded.required_fields,
    is_premium = excluded.is_premium;

-- ---------- migrations/0015_email_and_social_generator_activation.sql ----------
-- Stage 9: second and third tools, via the exact same mechanism as
-- migration 0014 (Stage 8) — pure data (UPDATE tools + INSERT templates),
-- zero ALTER TABLE, zero application code changes. That absence of code
-- changes is not an oversight; it is Stage 9's actual deliverable, per
-- the brief: proof that lib/generation/catalog.ts, ToolRunner,
-- ToolGallery, and lib/tools/query.ts are genuinely tool-agnostic, not
-- ad-generator-shaped code that happens to work once. Nothing in this
-- file requires any of those to change.
--
-- Both tools follow the same 4-field shape Stage 8 established
-- (type/topic-of-content, an optional offer, a required call to action)
-- — that shape is repeated here because it's what any short promotional
-- copy generator objectively needs, not because it was copied for
-- consistency's sake. `offerDetails` and `callToAction` reuse the exact
-- field names from ad-generator's schema where the concept is genuinely
-- identical (an optional offer, a call-to-action choice); `emailType`/
-- `platform` and `productOrTopic`/`contentTopic` are named for what each
-- tool actually asks, not forced to match ad-generator's
-- `productOrService` — there is no shared code reading these keys across
-- tools, so there is nothing to keep artificially uniform, and
-- ad-generator's own (already-shipped, Stage 8) data is not touched here.

update public.tools
set
  is_active = true,
  config_schema = $json$
{
  "fields": [
    {
      "type": "select",
      "name": "emailType",
      "label": "Email type",
      "required": true,
      "options": [
        { "label": "Promotional", "value": "Promotional" },
        { "label": "Newsletter", "value": "Newsletter" },
        { "label": "Announcement", "value": "Announcement" },
        { "label": "Welcome email", "value": "Welcome email" },
        { "label": "Re-engagement", "value": "Re-engagement" }
      ]
    },
    {
      "type": "text",
      "name": "productOrTopic",
      "label": "What is this email about?",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "offerDetails",
      "label": "Offer or key message",
      "helpText": "Optional — e.g. a discount, launch, or update worth highlighting.",
      "required": false,
      "maxLength": 500,
      "rows": 3
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Call to action",
      "required": true,
      "options": [
        { "label": "Shop Now", "value": "Shop Now" },
        { "label": "Learn More", "value": "Learn More" },
        { "label": "Sign Up", "value": "Sign Up" },
        { "label": "Book a Call", "value": "Book a Call" },
        { "label": "Reply to This Email", "value": "Reply to This Email" }
      ]
    }
  ]
}
$json$::jsonb
where slug = 'email-generator';

update public.tools
set
  is_active = true,
  config_schema = $json$
{
  "fields": [
    {
      "type": "select",
      "name": "platform",
      "label": "Platform",
      "required": true,
      "options": [
        { "label": "Instagram", "value": "Instagram" },
        { "label": "Facebook", "value": "Facebook" },
        { "label": "LinkedIn", "value": "LinkedIn" },
        { "label": "X (Twitter)", "value": "X (Twitter)" },
        { "label": "TikTok", "value": "TikTok" }
      ]
    },
    {
      "type": "text",
      "name": "contentTopic",
      "label": "What is this post about?",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "offerDetails",
      "label": "Offer or key message",
      "helpText": "Optional — e.g. a discount, launch, or update worth highlighting.",
      "required": false,
      "maxLength": 500,
      "rows": 3
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Call to action",
      "required": true,
      "options": [
        { "label": "Shop Now", "value": "Shop Now" },
        { "label": "Learn More", "value": "Learn More" },
        { "label": "Follow Us", "value": "Follow Us" },
        { "label": "Sign Up", "value": "Sign Up" },
        { "label": "Comment Below", "value": "Comment Below" }
      ]
    }
  ]
}
$json$::jsonb
where slug = 'social-generator';

-- Both templates: category 'General', same reasoning as ad-generator's
-- (migration 0014) — each adapts to whichever email type / platform the
-- user picks via its own field, so neither belongs to one of the 16
-- platform-specific categories config/templates.json lists for the
-- future Templates Library (Stage 10).

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium)
select
  id,
  'email-generator-default',
  'Standard Email',
  'General',
  $prompt$Write a single, ready-to-send marketing email.

Email type: {{emailType}}
Topic: {{productOrTopic}}
Offer or key message: {{offerDetails}}
Call to action: {{callToAction}}

Start with a subject line on its own line prefixed "Subject: ", then a blank line, then the email body. Output only that — no explanations, no extra commentary, no surrounding quotation marks.$prompt$,
  '["emailType", "productOrTopic", "callToAction"]'::jsonb,
  false
from public.tools
where slug = 'email-generator'
on conflict (slug) do update
  set
    tool_id = excluded.tool_id,
    name = excluded.name,
    category = excluded.category,
    prompt_template = excluded.prompt_template,
    required_fields = excluded.required_fields,
    is_premium = excluded.is_premium;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium)
select
  id,
  'social-generator-default',
  'Standard Social Post',
  'General',
  $prompt$Write a single, ready-to-publish social media post for {{platform}}.

Topic: {{contentTopic}}
Offer or key message: {{offerDetails}}
Call to action: {{callToAction}}

Follow {{platform}}'s typical length, tone and hashtag conventions. Output only the post itself — no explanations, no headers, no surrounding quotation marks.$prompt$,
  '["platform", "contentTopic", "callToAction"]'::jsonb,
  false
from public.tools
where slug = 'social-generator'
on conflict (slug) do update
  set
    tool_id = excluded.tool_id,
    name = excluded.name,
    category = excluded.category,
    prompt_template = excluded.prompt_template,
    required_fields = excluded.required_fields,
    is_premium = excluded.is_premium;

