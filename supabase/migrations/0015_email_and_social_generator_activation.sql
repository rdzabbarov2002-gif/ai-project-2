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
