-- GPT (OpenAI) writes the content now (config/settings.ts,
-- docs/decisions.md). Free allowed only Claude, which would have left
-- Free users and guests with no provider at all; it gets OpenAI too.
-- Claude stays allowed, so switching back is DEFAULT_AI_PROVIDER=claude
-- with no migration. Pro (claude, openai, gemini) and Enterprise ("all")
-- already include OpenAI. Idempotent.

update public.plan_limits pl
set allowed_ai_models = '["claude", "openai"]'::jsonb
from public.plans p
where p.id = pl.plan_id
  and p.slug = 'free';
