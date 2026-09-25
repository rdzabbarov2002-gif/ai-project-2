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
}

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
    .select("id, slug, name, prompt_template, required_fields")
    .eq("slug", slug)
    .eq("tool_id", toolId)
    .maybeSingle();

  return data ? toResolvedTemplate(data) : null;
}

/**
 * Stage 8: the tool page needs *a* template to exercise the templated
 * prompt path end-to-end, but Stage 10 (Templates Library picker UI)
 * hasn't shipped yet — there's no UI for a person to choose among several
 * templates, and today there's exactly one template per active tool
 * anyway. "Oldest by created_at" is a deterministic, well-defined answer
 * for that one-row case; it stays well-defined (if not necessarily the
 * *right* choice once real UX exists) if a tool later gets more
 * templates, and Stage 10 can introduce an explicit notion of "default"
 * then, driven by whatever picker UX it actually builds — adding that
 * now would be guessing at a UI decision this stage was explicitly told
 * not to make.
 */
export async function resolveDefaultTemplate(
  supabase: SupabaseClient<Database>,
  toolId: string,
): Promise<ResolvedTemplate | null> {
  const { data } = await supabase
    .from("templates")
    .select("id, slug, name, prompt_template, required_fields")
    .eq("tool_id", toolId)
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
}): ResolvedTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    promptTemplate: row.prompt_template,
    requiredFields: Array.isArray(row.required_fields)
      ? row.required_fields.filter((f): f is string => typeof f === "string")
      : [],
  };
}
