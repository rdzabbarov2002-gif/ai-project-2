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
