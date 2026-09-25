-- Stage 7 (Tools Gallery) needs `tools.description`, `tools.icon`, and
-- `tools.category` for cards, categories, and search — none of which
-- existed in migration 0006. This wasn't an oversight to quietly patch:
-- Stage 6 (ToolRunner) genuinely never needed them, so they weren't added
-- until a real consumer (this stage) required them. Additive-only, same
-- discipline as migration 0011 — no existing column touched, nothing
-- Stage 1-6 depends on changes shape.
--
-- All three nullable: existing seed rows (migration 0010) predate these
-- columns, and a tool without a category/description/icon should degrade
-- gracefully in the gallery (see components/tools/gallery/ToolCard.tsx),
-- not be forced to backfill placeholder content it doesn't have yet.

alter table public.tools
  add column description text,
  add column icon text,
  add column category text;

-- Supports category filtering — in-memory today (Stage 7 scope: dataset
-- is a handful of tools), but this is exactly the kind of index that
-- costs nothing now and avoids a migration later if/when category
-- filtering moves server-side, per the project architecture doc's
-- general "cheap now, expensive later" indexing rationale (see the
-- Stage 3 audit for company_profiles/generations precedent).
create index tools_category_idx on public.tools(category);
