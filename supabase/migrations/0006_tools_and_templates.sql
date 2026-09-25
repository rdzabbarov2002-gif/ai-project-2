-- Reference data that drives the whole "add a tool = a config row, not a
-- deploy" mechanism (project architecture doc §7/§14). Public read-only —
-- both guests and signed-in users need to see the Tools Gallery and
-- Templates Library before/without registering.

create table public.tools (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  config_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.tools
  for each row execute procedure extensions.moddatetime(updated_at);

create table public.templates (
  id uuid primary key default extensions.gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  slug text not null unique,
  name text not null,
  category text not null,
  prompt_template text not null default '',
  required_fields jsonb not null default '[]'::jsonb,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index templates_tool_id_idx on public.templates(tool_id);
create index templates_category_idx on public.templates(category);

create trigger set_updated_at
  before update on public.templates
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.tools enable row level security;
alter table public.templates enable row level security;

create policy "active tools are publicly readable"
  on public.tools for select
  to anon, authenticated
  using (is_active = true);

create policy "templates are publicly readable"
  on public.templates for select
  to anon, authenticated
  using (true);

-- No write policies on either table: managed by hand via the SQL editor
-- (or a future admin tool) only, per the "config, not code" principle —
-- application code only ever reads these.
