import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TemplateListItem } from "./types";

/**
 * Lists every template whose owning tool is active, for the Templates
 * Library. Not a duplicate of lib/generation/catalog.ts's
 * resolveTemplate()/resolveDefaultTemplate(): those look up exactly one
 * template — by slug, or by "first for this tool" — for the generation
 * pipeline and the tool page; this lists *all* of them, joined with their
 * tool's slug/name, for browsing. Same relationship to
 * lib/generation/catalog.ts as lib/tools/catalog.ts already has to it
 * (Stage 7) — a different query shape for a different consumer, not a
 * second version of the same one.
 *
 * The `tools!inner(...)` join + `.eq("tools.is_active", true)` matters:
 * `templates`' own RLS policy (migration 0006) is `using (true)` — it has
 * no idea whether a template's owning tool is active, only `tools`' RLS
 * does. Every template in this project happens to belong to an active
 * tool today (Stage 8/9), so this was latent, not visible, until now —
 * resolveTemplate()/resolveDefaultTemplate() are only ever called after
 * resolveTool() has already confirmed the tool is active, so they never
 * needed this check themselves. This function is the first one that
 * lists templates *without* going through resolveTool() first, so it's
 * the first place a template belonging to a since-deactivated tool could
 * actually surface — a real card linking to a "not available" page. The
 * filter is applied here, in the query, not by changing the RLS policy
 * (which would be a schema change touching a file this stage has no
 * objective need to modify).
 */
export async function listTemplates(
  supabase: SupabaseClient<Database>,
): Promise<TemplateListItem[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("slug, name, category, tools!inner(slug, name, is_active)")
    .eq("tools.is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new TemplateCatalogError("Failed to load templates.", error);
  }

  return (data ?? []).map((row) => {
    // Cast, not inferred — same caveat as lib/generation/plan.ts (Stage 5):
    // database.types.ts is hand-written and doesn't carry the
    // `Relationships` metadata supabase-js uses to type a `!inner` embed
    // precisely.
    const tool = row.tools as unknown as { slug: string; name: string; is_active: boolean };
    return {
      slug: row.slug,
      name: row.name,
      category: row.category,
      toolSlug: tool.slug,
      toolName: tool.name,
    };
  });
}

export class TemplateCatalogError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TemplateCatalogError";
  }
}
