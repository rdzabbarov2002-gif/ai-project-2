import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ResolvedTool {
  id: string;
  slug: string;
  name: string;
  configSchema: Record<string, unknown>;
}

export interface ResolvedTemplate {
  id: string;
  slug: string;
  name: string;
  promptTemplate: string;
  requiredFields: string[];
  /** The template's own form (migration 0016), or null to use the tool's
   *  — the tool page renders `template.configSchema ?? tool.configSchema`. */
  configSchema: Record<string, unknown> | null;
  /** Gated by the plan's `premium_templates` (checkUsage, Stage 10). */
  isPremium: boolean;
}

const TEMPLATE_COLUMNS =
  "id, slug, name, prompt_template, required_fields, config_schema, is_premium";

/**
 * Reads through the request-scoped client, not admin — `tools`/`templates`
 * are public-read reference tables (migration 0006), and their RLS policy
 * already filters to `is_active = true` for tools. That's not incidental:
 * it means an inactive tool and a nonexistent tool look identical here
 * (both resolve to `null`), which is exactly the behavior we want — no
 * separate "is it disabled or does it not exist" branch needed, and no
 * internal state leaked to the caller either way.
 */
export async function resolveTool(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<ResolvedTool | null> {
  const { data } = await supabase
    .from("tools")
    .select("id, slug, name, config_schema")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    configSchema: (data.config_schema as Record<string, unknown>) ?? {},
  };
}

export async function resolveTemplate(
  supabase: SupabaseClient<Database>,
  slug: string,
  toolId: string,
): Promise<ResolvedTemplate | null> {
  const { data } = await supabase
    .from("templates")
    .select(TEMPLATE_COLUMNS)
    .eq("slug", slug)
    .eq("tool_id", toolId)
    .maybeSingle();

  return data ? toResolvedTemplate(data) : null;
}

/**
 * Stage 8: the tool page needs *a* template to exercise the templated
 * prompt path end-to-end. It originally took the oldest template by
 * created_at and noted that Stage 10 could introduce an explicit notion
 * of "default" once tools had several templates. Stage 10's completion
 * did (migration 0016, `templates.is_default`, at most one per tool): the
 * flagged template wins, and "oldest" remains only as the tie-breaker /
 * fallback for a tool with no flagged default — "oldest" alone stopped
 * being well-defined once a single seed transaction could give every
 * template of a tool the same created_at.
 */
export async function resolveDefaultTemplate(
  supabase: SupabaseClient<Database>,
  toolId: string,
): Promise<ResolvedTemplate | null> {
  const { data } = await supabase
    .from("templates")
    .select(TEMPLATE_COLUMNS)
    .eq("tool_id", toolId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ? toResolvedTemplate(data) : null;
}

/** Shared by resolveTemplate and resolveDefaultTemplate so the row→shape
 *  mapping exists in exactly one place — the two functions differ only in
 *  which row they select, never in how they interpret it. */
function toResolvedTemplate(row: {
  id: string;
  slug: string;
  name: string;
  prompt_template: string;
  required_fields: unknown;
  config_schema: unknown;
  is_premium: boolean;
}): ResolvedTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    promptTemplate: row.prompt_template,
    requiredFields: Array.isArray(row.required_fields)
      ? row.required_fields.filter((f): f is string => typeof f === "string")
      : [],
    configSchema: (row.config_schema as Record<string, unknown> | null) ?? null,
    isPremium: row.is_premium,
  };
}
