import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ToolListItem } from "./types";

/**
 * The one place that lists active tools for browsing (the Tools Gallery).
 * This is a genuinely separate read from `lib/generation/catalog.ts`'s
 * `resolveTool()` — not a duplicate of it — because it answers a
 * different question for a different consumer:
 *
 *   resolveTool(slug)   → one tool, by slug, for /api/generate to build a
 *                          prompt with (id, name, configSchema — no
 *                          description/icon/category; the pipeline never
 *                          needed them).
 *   listActiveTools()   → every active tool, for the Gallery to render
 *                          cards from (slug, name, description, icon,
 *                          category — no id/configSchema; the Gallery
 *                          never needed those).
 *
 * Both read the same `tools` table through the same public-read RLS
 * policy (migration 0006, `is_active = true` for anon/authenticated) —
 * that policy is the single source of truth for "what counts as
 * available," reused here rather than re-implemented. Neither file
 * imports the other; there was nothing in `resolveTool()` this function
 * could have called without changing that function's return shape for a
 * caller (the pipeline) that never asked for one.
 */
export async function listActiveTools(
  supabase: SupabaseClient<Database>,
): Promise<ToolListItem[]> {
  const { data, error } = await supabase
    .from("tools")
    .select("slug, name, description, icon, category")
    .order("name", { ascending: true });

  if (error) {
    throw new ToolCatalogError("Failed to load tools.", error);
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category,
  }));
}

export class ToolCatalogError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ToolCatalogError";
  }
}
