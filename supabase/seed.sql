-- ============================================================
-- AI Marketing Workspace — seed data (through Stage 15)
-- Generated from migrations/0010, 0013, 0014, 0015, 0017. Run AFTER schema.sql.
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

-- ---------- migrations/0017_templates_library_content.sql ----------
-- Stage 10 (completion): fills the Templates Library with the categories
-- the architecture doc lists (§15) — until now it held exactly one
-- "General" template per tool. Pure data, same mechanism as 0014/0015
-- (Stage 8/9): no application code knows about any of these rows; the
-- Library, the tool page and /api/generate pick them up as data.
--
-- What this adds:
--  * `content-generator` ("AI Content Writer") — a fourth tool, needed
--    because five of the §15 categories (Landing Page, SEO Article, Blog
--    Post, YouTube Script, Product Description) are long-form content no
--    existing tool produces. Added exactly the way §14 describes adding a
--    tool: a `tools` row + a config_schema + templates. Allowed on the
--    Free plan alongside the other three (Pro/Enterprise already allow
--    "all").
--  * 17 templates across the 16 §15 categories, each with its own form
--    (templates.config_schema, migration 0016) where the tool's general
--    form would ask for the wrong things — e.g. no "Platform" select on a
--    Facebook-specific ad. Templates that are just an angle on the tool's
--    own inputs (Product Launch / SaaS / Ecommerce ads, the content
--    writer's default) leave config_schema NULL and reuse the tool form.
--  * Explicit defaults (templates.is_default, migration 0016): the three
--    Stage 8/9 "-default" templates and the content writer's own
--    "Standard Content Draft" — so opening a tool without `?template=`
--    keeps showing the same general-purpose template it always did,
--    however many templates the tool now has.
--  * Premium tier: 6 of the 17 (SaaS, Cold Email, B2B, Landing Page, SEO
--    Article, YouTube Script) are `is_premium = true`; Pro/Enterprise get
--    `plan_limits.premium_templates = true` (architecture doc §18: Pro
--    gets the whole library). The Stage 8/9 defaults stay free.
--
-- Every template's {{placeholders}} match its form's field names one to
-- one, and `required_fields` equals that form's required fields — the
-- same invariant Stage 8/9 checked by hand, now enforced by a unit test
-- (tests/templates-migrations.test.ts) against this file.
--
-- Idempotent (upserts on slug / plan_id), safe to re-run with seed.sql.

-- Premium entitlement per plan (column added in 0016, default false).
update public.plan_limits pl
set premium_templates = p.slug in ('pro', 'enterprise')
from public.plans p
where p.id = pl.plan_id;

-- The fourth tool.
insert into public.tools (slug, name, description, icon, category, is_active, config_schema)
values (
  'content-generator',
  'AI Content Writer',
  'Draft blog posts, articles, landing pages, video scripts and product descriptions.',
  '📝',
  'Content',
  true,
  $json${
  "fields": [
    {
      "type": "select",
      "name": "contentType",
      "label": "Content type",
      "required": true,
      "options": [
        {
          "label": "Blog post",
          "value": "Blog post"
        },
        {
          "label": "Article",
          "value": "Article"
        },
        {
          "label": "Landing page section",
          "value": "Landing page section"
        },
        {
          "label": "Video script",
          "value": "Video script"
        },
        {
          "label": "Product description",
          "value": "Product description"
        },
        {
          "label": "Website copy",
          "value": "Website copy"
        }
      ]
    },
    {
      "type": "text",
      "name": "topic",
      "label": "Topic or product",
      "required": true,
      "maxLength": 200,
      "placeholder": "e.g. How to choose running shoes"
    },
    {
      "type": "textarea",
      "name": "keyPoints",
      "label": "Key points to cover",
      "helpText": "Optional — leave empty to let the AI choose.",
      "required": false,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "select",
      "name": "length",
      "label": "Length",
      "required": true,
      "defaultValue": "Medium",
      "options": [
        {
          "label": "Short",
          "value": "Short"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Long",
          "value": "Long"
        }
      ]
    }
  ]
}$json$::jsonb
)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      category = excluded.category,
      is_active = excluded.is_active,
      config_schema = excluded.config_schema;

-- Free plan: the three Stage 8/9 tools plus the content writer. Only
-- touches a list-valued allowed_tool_ids ("all" plans already include it).
update public.plan_limits pl
set allowed_tool_ids = '["ad-generator", "email-generator", "social-generator", "content-generator"]'::jsonb
from public.plans p
where p.id = pl.plan_id
  and p.slug = 'free'
  and jsonb_typeof(pl.allowed_tool_ids) = 'array';

-- The templates. One INSERT per template (rather than one VALUES list)
-- so each prompt and form reads as a unit.

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'content-generator-default',
  'Standard Content Draft',
  'General',
  $prompt$Write a {{contentType}}.

Topic or product: {{topic}}
Key points to cover (may be empty — if so, choose the most useful ones yourself): {{keyPoints}}
Length: {{length}}

Structure it the way a {{contentType}} is normally structured, with headings as plain text on their own lines where they help (no Markdown symbols).

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the content itself — no explanations.$prompt$,
  '["contentType", "topic", "length"]'::jsonb,
  false,
  null,
  true
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'facebook-ad',
  'Facebook Ad',
  'Facebook Ads',
  $prompt$Write a Facebook feed ad.

Product or service: {{productOrService}}
Offer or promotion (may be empty): {{offerDetails}}
Call-to-action button: {{callToAction}}

Return exactly three labeled parts:
Primary text: 1–3 short sentences, the hook first (the first ~125 characters show before "See more").
Headline: up to 40 characters.
Description: up to 30 characters.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only those three labeled parts — no explanations, no surrounding quotation marks.$prompt$,
  '["productOrService", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
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
      "label": "Call-to-action button",
      "required": true,
      "options": [
        {
          "label": "Shop Now",
          "value": "Shop Now"
        },
        {
          "label": "Learn More",
          "value": "Learn More"
        },
        {
          "label": "Sign Up",
          "value": "Sign Up"
        },
        {
          "label": "Get Offer",
          "value": "Get Offer"
        },
        {
          "label": "Book Now",
          "value": "Book Now"
        },
        {
          "label": "Contact Us",
          "value": "Contact Us"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'google-search-ad',
  'Google Search Ad',
  'Google Ads',
  $prompt$Write a Google Ads responsive search ad.

Product or service: {{productOrService}}
Main keywords (may be empty): {{keywords}}
Offer or promotion (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

Return 5 headlines (each at most 30 characters) and 2 descriptions (each at most 90 characters), one per line, labeled "Headline 1:" … "Headline 5:", "Description 1:", "Description 2:". Work the keywords in naturally where they fit; include the call to action in at least one headline or description.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the labeled lines — no explanations.$prompt$,
  '["productOrService", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "productOrService",
      "label": "Product or service being advertised",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "text",
      "name": "keywords",
      "label": "Main keywords",
      "required": false,
      "maxLength": 200,
      "helpText": "Optional — comma-separated search terms you're bidding on."
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
        {
          "label": "Buy Now",
          "value": "Buy Now"
        },
        {
          "label": "Get a Quote",
          "value": "Get a Quote"
        },
        {
          "label": "Book Online",
          "value": "Book Online"
        },
        {
          "label": "Learn More",
          "value": "Learn More"
        },
        {
          "label": "Sign Up",
          "value": "Sign Up"
        },
        {
          "label": "Call Today",
          "value": "Call Today"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'instagram-ad',
  'Instagram Ad',
  'Instagram Ads',
  $prompt$Write an Instagram ad caption.

Product or service: {{productOrService}}
Offer or promotion (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

Open with a one-line hook, keep it under ~150 words with short lines and line breaks, use at most three emojis, end with the call to action followed by 5–8 relevant hashtags on their own line.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the caption — no explanations, no surrounding quotation marks.$prompt$,
  '["productOrService", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
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
        {
          "label": "Shop Now",
          "value": "Shop Now"
        },
        {
          "label": "Learn More",
          "value": "Learn More"
        },
        {
          "label": "Sign Up",
          "value": "Sign Up"
        },
        {
          "label": "Book Now",
          "value": "Book Now"
        },
        {
          "label": "Send Message",
          "value": "Send Message"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'product-launch-ad',
  'Product Launch Ad',
  'Product Launch',
  $prompt$Write a launch announcement ad for {{platform}} introducing something new.

What's launching: {{productOrService}}
Launch offer (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

Lead with what's new and why it matters to the reader right now. Create genuine urgency around the launch without false scarcity. Follow {{platform}}'s typical ad copy length and conventions.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the ad copy itself — no explanations, no headers, no surrounding quotation marks.$prompt$,
  '["platform", "productOrService", "callToAction"]'::jsonb,
  false,
  null,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'saas-free-trial-ad',
  'SaaS Free-Trial Ad',
  'SaaS',
  $prompt$Write a {{platform}} ad for a software product that drives free-trial or demo sign-ups.

Product: {{productOrService}}
Offer (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

Name the problem it solves in the reader's words, promise one concrete outcome and a fast time-to-value, and pre-empt one typical objection (setup effort, switching cost, or price). Follow {{platform}}'s typical ad copy length and conventions.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the ad copy itself — no explanations, no headers, no surrounding quotation marks.$prompt$,
  '["platform", "productOrService", "callToAction"]'::jsonb,
  true,
  null,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'ecommerce-sale-ad',
  'Ecommerce Sale Ad',
  'Ecommerce',
  $prompt$Write an online-store promotion ad for {{platform}}.

Product or collection: {{productOrService}}
Sale or offer (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

Lead with the product's most desirable benefit, make the offer prominent if one is given, and keep it scannable. Follow {{platform}}'s typical ad copy length and conventions.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the ad copy itself — no explanations, no headers, no surrounding quotation marks.$prompt$,
  '["platform", "productOrService", "callToAction"]'::jsonb,
  false,
  null,
  false
from public.tools
where slug = 'ad-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'linkedin-post',
  'LinkedIn Post',
  'LinkedIn',
  $prompt$Write a LinkedIn post.

Topic: {{contentTopic}}
Key insight or story to build it around (may be empty): {{keyInsight}}
Call to action: {{callToAction}}

120–220 words. A first line strong enough to earn the "…see more" click, short paragraphs of 1–2 sentences, professional but human — no corporate buzzwords. End with the call to action and at most three relevant hashtags.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the post itself — no explanations, no surrounding quotation marks.$prompt$,
  '["contentTopic", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "contentTopic",
      "label": "Topic",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "keyInsight",
      "label": "Key insight or story",
      "helpText": "Optional — a lesson, result or anecdote to anchor the post.",
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
        {
          "label": "Comment with your thoughts",
          "value": "Comment with your thoughts"
        },
        {
          "label": "Visit our website",
          "value": "Visit our website"
        },
        {
          "label": "Follow for more",
          "value": "Follow for more"
        },
        {
          "label": "Book a call",
          "value": "Book a call"
        },
        {
          "label": "Share with your network",
          "value": "Share with your network"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'social-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'x-thread',
  'X (Twitter) Thread',
  'X',
  $prompt$Write a thread for X (Twitter).

Topic: {{contentTopic}}
Offer or link to promote (may be empty): {{offerDetails}}
Call to action: {{callToAction}}

4–6 posts, each at most 280 characters, numbered "1/", "2/" and so on. The first post is the hook; each post stands on its own; the last post carries the call to action. At most two hashtags, only in the last post.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the posts, separated by a blank line — no explanations.$prompt$,
  '["contentTopic", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "contentTopic",
      "label": "Topic",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "offerDetails",
      "label": "Offer or link to promote",
      "helpText": "Optional.",
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
        {
          "label": "Follow for more",
          "value": "Follow for more"
        },
        {
          "label": "Visit our website",
          "value": "Visit our website"
        },
        {
          "label": "Reply with your take",
          "value": "Reply with your take"
        },
        {
          "label": "Repost if useful",
          "value": "Repost if useful"
        },
        {
          "label": "Sign up",
          "value": "Sign up"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'social-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'cold-outreach-email',
  'Cold Outreach Email',
  'Cold Email',
  $prompt$Write a cold outreach email.

Recipient: {{recipientRole}}
What we offer: {{productOrTopic}}
Problem we solve for them (may be empty): {{painPoint}}
Call to action: {{callToAction}}

Start with a line "Subject:" (at most 50 characters, no clickbait), then the body: 80–130 words, an opening that shows you understand the recipient's role, one clear value proposition, no hype, and a single low-friction call to action. Use [First name] where the recipient's name goes.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the subject line and the email — no explanations.$prompt$,
  '["recipientRole", "productOrTopic", "callToAction"]'::jsonb,
  true,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "recipientRole",
      "label": "Who you're writing to",
      "required": true,
      "maxLength": 200,
      "placeholder": "e.g. Head of Marketing at a mid-size retailer"
    },
    {
      "type": "text",
      "name": "productOrTopic",
      "label": "What you offer",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "painPoint",
      "label": "Problem you solve for them",
      "helpText": "Optional.",
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
        {
          "label": "Book a 15-minute call",
          "value": "Book a 15-minute call"
        },
        {
          "label": "Reply to this email",
          "value": "Reply to this email"
        },
        {
          "label": "Try a free demo",
          "value": "Try a free demo"
        },
        {
          "label": "Visit our website",
          "value": "Visit our website"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'email-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'newsletter-issue',
  'Newsletter Issue',
  'Newsletter',
  $prompt$Write an email newsletter issue.

Main topic: {{productOrTopic}}
Highlights or news to include (may be empty): {{highlights}}
Call to action: {{callToAction}}

Start with a line "Subject:" (at most 50 characters) and a line "Preview text:" (at most 90 characters). Then a short friendly intro, 2–4 sections each with a short heading on its own line (plain text, no Markdown symbols), and a closing that leads into the call to action.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the newsletter — no explanations.$prompt$,
  '["productOrTopic", "callToAction"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "productOrTopic",
      "label": "Main topic of this issue",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "highlights",
      "label": "Highlights or news to include",
      "helpText": "Optional — one per line works best.",
      "required": false,
      "maxLength": 1000,
      "rows": 5
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Call to action",
      "required": true,
      "options": [
        {
          "label": "Read more on our blog",
          "value": "Read more on our blog"
        },
        {
          "label": "Shop the collection",
          "value": "Shop the collection"
        },
        {
          "label": "Reply and tell us",
          "value": "Reply and tell us"
        },
        {
          "label": "Follow us on social",
          "value": "Follow us on social"
        },
        {
          "label": "Book now",
          "value": "Book now"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'email-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'b2b-follow-up-email',
  'B2B Follow-up Email',
  'B2B',
  $prompt$Write a B2B follow-up email.

Recipient: {{recipientRole}}
Our product or service: {{productOrTopic}}
Previous interaction (may be empty): {{meetingContext}}
Call to action: {{callToAction}}

Start with a line "Subject:" (at most 50 characters), then the body: under 150 words, reference the previous interaction if given, restate the one outcome that matters most to this recipient, make the next step concrete and easy. Professional, warm, no pressure tactics. Use [First name] where the recipient's name goes.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the subject line and the email — no explanations.$prompt$,
  '["recipientRole", "productOrTopic", "callToAction"]'::jsonb,
  true,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "recipientRole",
      "label": "Who you're writing to",
      "required": true,
      "maxLength": 200,
      "placeholder": "e.g. Operations Director at a logistics company"
    },
    {
      "type": "text",
      "name": "productOrTopic",
      "label": "Your product or service",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "meetingContext",
      "label": "Previous interaction",
      "helpText": "Optional — e.g. met at a trade show, had a demo last week.",
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
        {
          "label": "Schedule a follow-up call",
          "value": "Schedule a follow-up call"
        },
        {
          "label": "Review the proposal",
          "value": "Review the proposal"
        },
        {
          "label": "Start a pilot",
          "value": "Start a pilot"
        },
        {
          "label": "Reply with questions",
          "value": "Reply with questions"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'email-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'landing-page-copy',
  'Landing Page Copy',
  'Landing Page',
  $prompt$Write the copy for a landing page.

Product or service: {{productOrService}}
Key benefits or features (may be empty): {{keyBenefits}}
Primary call to action: {{callToAction}}

Return these labeled sections, in order:
Hero headline: at most 10 words.
Subheadline: one sentence.
Benefits: three blocks, each a short title plus 1–2 sentences.
How it works: three short steps.
FAQ: three questions with short answers.
Closing call to action: a one-line headline plus the button text.

Headings as plain text on their own lines (no Markdown symbols). Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Output only the copy — no explanations.$prompt$,
  '["productOrService", "callToAction"]'::jsonb,
  true,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "productOrService",
      "label": "Product or service",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "keyBenefits",
      "label": "Key benefits or features",
      "helpText": "Optional — leave empty to let the AI choose.",
      "required": false,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Primary call to action",
      "required": true,
      "options": [
        {
          "label": "Start free trial",
          "value": "Start free trial"
        },
        {
          "label": "Get started",
          "value": "Get started"
        },
        {
          "label": "Book a demo",
          "value": "Book a demo"
        },
        {
          "label": "Buy now",
          "value": "Buy now"
        },
        {
          "label": "Join the waitlist",
          "value": "Join the waitlist"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'seo-article',
  'SEO Article',
  'SEO Article',
  $prompt$Write a search-optimized article.

Topic: {{topic}}
Target keyword: {{targetKeyword}}
Points to cover (may be empty): {{keyPoints}}
Length: {{length}}

Start with a line "Title:" (at most 60 characters, containing the target keyword) and a line "Meta description:" (at most 155 characters). Then the article: an introduction that uses the keyword in its first paragraph, sections with descriptive headings (at least one containing the keyword), and a short conclusion. Use the keyword naturally — never stuff it. Write for the reader first.

Headings as plain text on their own lines (no Markdown symbols). Do not invent statistics, quotes or sources. Output only the title, meta description and article — no explanations.$prompt$,
  '["topic", "targetKeyword", "length"]'::jsonb,
  true,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "topic",
      "label": "Article topic",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "text",
      "name": "targetKeyword",
      "label": "Target keyword",
      "required": true,
      "maxLength": 100,
      "placeholder": "e.g. best running shoes for beginners"
    },
    {
      "type": "textarea",
      "name": "keyPoints",
      "label": "Points to cover",
      "helpText": "Optional — leave empty to let the AI choose.",
      "required": false,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "select",
      "name": "length",
      "label": "Length",
      "required": true,
      "defaultValue": "Medium (~900 words)",
      "options": [
        {
          "label": "Short (~500 words)",
          "value": "Short (~500 words)"
        },
        {
          "label": "Medium (~900 words)",
          "value": "Medium (~900 words)"
        },
        {
          "label": "Long (~1400 words)",
          "value": "Long (~1400 words)"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'blog-post',
  'Blog Post',
  'Blog Post',
  $prompt$Write a blog post.

Topic: {{topic}}
Points to cover (may be empty): {{keyPoints}}
Length: {{length}}

Start with a line "Title:". Then an engaging introduction, 3–5 sections with short headings, and a conclusion with a soft call to action. Conversational, practical, specific — no filler.

Headings as plain text on their own lines (no Markdown symbols). Do not invent statistics, quotes or sources. Output only the title and the post — no explanations.$prompt$,
  '["topic", "length"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "topic",
      "label": "Blog post topic",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "keyPoints",
      "label": "Points to cover",
      "helpText": "Optional — leave empty to let the AI choose.",
      "required": false,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "select",
      "name": "length",
      "label": "Length",
      "required": true,
      "defaultValue": "Medium (~700 words)",
      "options": [
        {
          "label": "Short (~400 words)",
          "value": "Short (~400 words)"
        },
        {
          "label": "Medium (~700 words)",
          "value": "Medium (~700 words)"
        },
        {
          "label": "Long (~1100 words)",
          "value": "Long (~1100 words)"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'youtube-video-script',
  'YouTube Video Script',
  'YouTube Script',
  $prompt$Write a YouTube video script.

Video topic: {{topic}}
Target length: {{videoLength}}
Points to cover (may be empty): {{keyPoints}}
Call to action: {{callToAction}}

Structure: Hook (the first 5–10 seconds), Intro, 2–5 main segments, Outro with the call to action — each as a plain-text heading on its own line. Written to be spoken aloud: short sentences, direct address to the viewer. Put visual or B-roll suggestions in square brackets. Size it at roughly 150 spoken words per minute of the target length.

Do not invent statistics, quotes or sources. Output only the script — no explanations.$prompt$,
  '["topic", "videoLength", "callToAction"]'::jsonb,
  true,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "topic",
      "label": "Video topic",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "select",
      "name": "videoLength",
      "label": "Target length",
      "required": true,
      "defaultValue": "3–5 minutes",
      "options": [
        {
          "label": "Short (under 60 seconds)",
          "value": "Short (under 60 seconds)"
        },
        {
          "label": "3–5 minutes",
          "value": "3–5 minutes"
        },
        {
          "label": "8–10 minutes",
          "value": "8–10 minutes"
        }
      ]
    },
    {
      "type": "textarea",
      "name": "keyPoints",
      "label": "Points to cover",
      "helpText": "Optional — leave empty to let the AI choose.",
      "required": false,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "select",
      "name": "callToAction",
      "label": "Call to action",
      "required": true,
      "options": [
        {
          "label": "Subscribe to the channel",
          "value": "Subscribe to the channel"
        },
        {
          "label": "Visit our website",
          "value": "Visit our website"
        },
        {
          "label": "Comment below",
          "value": "Comment below"
        },
        {
          "label": "Check the link in the description",
          "value": "Check the link in the description"
        }
      ]
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

insert into public.templates (tool_id, slug, name, category, prompt_template, required_fields, is_premium, config_schema, is_default)
select
  id,
  'product-description',
  'Product Description',
  'Product Description',
  $prompt$Write an online-store product description.

Product: {{productName}}
Key features or specs: {{features}}
Who it's for (may be empty): {{targetCustomer}}

Return a short benefit-led headline, a 2–3 sentence paragraph on why it's worth buying, and 4–6 bullet points (each starting with "- ") that turn features into benefits.

Do not invent prices, discounts, statistics, testimonials or guarantees that weren't given. Don't add specifications that weren't given. Output only the description — no explanations.$prompt$,
  '["productName", "features"]'::jsonb,
  false,
  $json${
  "fields": [
    {
      "type": "text",
      "name": "productName",
      "label": "Product name",
      "required": true,
      "maxLength": 200
    },
    {
      "type": "textarea",
      "name": "features",
      "label": "Key features or specs",
      "required": true,
      "maxLength": 1000,
      "rows": 4
    },
    {
      "type": "text",
      "name": "targetCustomer",
      "label": "Who it's for",
      "required": false,
      "maxLength": 200,
      "placeholder": "e.g. first-time runners"
    }
  ]
}$json$::jsonb,
  false
from public.tools
where slug = 'content-generator'
on conflict (slug) do update
  set tool_id = excluded.tool_id,
      name = excluded.name,
      category = excluded.category,
      prompt_template = excluded.prompt_template,
      required_fields = excluded.required_fields,
      is_premium = excluded.is_premium,
      config_schema = excluded.config_schema,
      is_default = excluded.is_default;

-- The Stage 8/9 templates (migrations 0014/0015) become their tools'
-- explicit defaults.
update public.templates
set is_default = true
where slug in ('ad-generator-default', 'email-generator-default', 'social-generator-default');

