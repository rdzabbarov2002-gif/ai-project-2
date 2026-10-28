-- Phase 4: what each generation cost and how long it took — the numbers
-- plan pricing is set from (README.md → "Cost and speed of generations").
-- Tokens as the provider reports them (Claude bills thinking as output, and
-- output_tokens already includes it); duration of the AI call in
-- milliseconds. Null on rows saved before this migration.
--
-- Client privileges are unchanged (migration 0019): users can read these
-- on their own rows and never update them.

alter table public.generations
  add column input_tokens integer,
  add column output_tokens integer,
  add column duration_ms integer;
