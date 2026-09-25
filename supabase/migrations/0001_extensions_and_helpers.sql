-- Stage 3: extensions and shared helpers used by every later migration.

-- UUID generation for primary keys.
create extension if not exists "pgcrypto" with schema extensions;

-- Generic "bump updated_at on every UPDATE" trigger helper, ships with
-- Supabase Postgres. Used instead of a hand-rolled trigger function so
-- every table gets identical, well-tested behavior.
create extension if not exists "moddatetime" schema extensions;
