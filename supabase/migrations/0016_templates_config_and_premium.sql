-- Stage 10 (completion): the three columns the Templates Library needs to
-- finish what the architecture doc describes and Stage 10 left open.
-- Additive only — no existing column, row, policy or migration changes.
--
-- 1. templates.config_schema — an optional per-template form. The
--    architecture doc (§12) has ToolRunner render "config_schema
--    инструмента/шаблона": a tool's form OR a template's. NULL — every
--    row that exists today — means "use the owning tool's form", so
--    nothing shipped in Stage 8/9 changes behavior. Needed because
--    platform/format-specific templates ask for different inputs than
--    their tool's general-purpose form: a "Facebook Ad" template has no
--    use for ad-generator's "Platform" select (and showing it would let a
--    person pick "Google Search" for a Facebook template), a cold email
--    needs "who you're writing to", an SEO article needs a target
--    keyword. Same format as tools.config_schema
--    (lib/tool-config/schema.ts), same parser, same fallback.
--
-- 2. templates.is_default — which template a tool page uses when no
--    `?template=` is given. Stage 8 picked "oldest by created_at" and
--    said explicitly that Stage 10 could introduce a real notion of
--    "default" once tools had several templates. They now do (0017), and
--    "oldest" stops being well-defined: when seed.sql runs in one
--    transaction (the Supabase SQL editor does that), every template of a
--    tool gets the same now(). At most one default per tool, enforced by
--    a partial unique index; lib/generation/catalog.ts still falls back to
--    the oldest template for a tool that has none flagged.
--
-- 3. plan_limits.premium_templates — whether a plan may use templates
--    flagged `templates.is_premium` (a column since Stage 3 that nothing
--    ever read). Architecture doc §18: Free gets the basic library, Pro
--    gets "вся библиотека шаблонов". A plan_limits column rather than a
--    `plan slug !== 'free'` check in code, for the same reason every other
--    entitlement lives in plan_limits (architecture doc §13 — limits are
--    data, not code). Defaults to false (fail closed); the data migration
--    that follows (0017) turns it on for Pro/Enterprise and flags the
--    defaults.

alter table public.templates
  add column config_schema jsonb;

alter table public.templates
  add column is_default boolean not null default false;

create unique index templates_one_default_per_tool_idx
  on public.templates(tool_id)
  where is_default;

alter table public.plan_limits
  add column premium_templates boolean not null default false;
