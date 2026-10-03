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
