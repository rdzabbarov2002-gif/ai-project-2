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
