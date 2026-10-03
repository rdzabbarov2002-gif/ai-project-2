import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { firstEmbed, type Embed } from "@/lib/supabase/embed";

export interface GenerationListItem {
  id: string;
  output: string;
  createdAt: string;
  toolName: string;
  toolSlug: string;
  templateName: string | null;
  isFavorite: boolean;
}

export interface GenerationFilters {
  /** Only this tool's generations. */
  toolSlug?: string;
  favoritesOnly?: boolean;
}

/**
 * A page of the signed-in user's generations, newest first. Written as
 * the History page's own inline query in Stage 14; moved here in Stage
 * 13's completion because the Dashboard's "recent generations" needs the
 * exact same select and row mapping, and the History page gained filters.
 *
 * Unchanged from Stage 14's reasoning: a direct query through the
 * request-scoped client — RLS's `auth.uid() = user_id` select policy
 * (migration 0008) is the gate — with `tools`/`templates` embedded in the
 * same round trip rather than resolved per row, and "is there another
 * page" answered by fetching one extra row instead of a COUNT(*).
 * `tools!inner` because the tool filter is applied on the embed; every
 * generation has a tool (`tool_id` is NOT NULL), so no row is lost to the
 * inner join when no filter is set.
 */
export async function listUserGenerations(
  supabase: SupabaseClient<Database>,
  userId: string,
  { offset = 0, limit, filters = {} }: { offset?: number; limit: number; filters?: GenerationFilters },
): Promise<{ items: GenerationListItem[]; hasMore: boolean }> {
  let query = supabase
    .from("generations")
    .select("id, output, created_at, is_favorite, tools!inner(name, slug), templates(name)")
    .eq("user_id", userId);

  if (filters.toolSlug) query = query.eq("tools.slug", filters.toolSlug);
  if (filters.favoritesOnly) query = query.eq("is_favorite", true);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  // Thrown, not swallowed into an empty list: the pages' error.tsx
  // boundaries exist for exactly this, and "you have no generations"
  // would be a misleading thing to show when the read actually failed.
  if (error) throw new Error(`Failed to load generations: ${error.message}`);

  const rows = data ?? [];
  return {
    hasMore: rows.length > limit,
    items: rows.slice(0, limit).map((row) => {
      // Cast + normalize — see lib/supabase/embed.ts.
      const tool = firstEmbed(row.tools as unknown as Embed<{ name: string; slug: string }>);
      const template = firstEmbed(row.templates as unknown as Embed<{ name: string }>);
      return {
        id: row.id,
        output: row.output,
        createdAt: row.created_at,
        toolName: tool?.name ?? "Unknown tool",
        toolSlug: tool?.slug ?? "",
        templateName: template?.name ?? null,
        isFavorite: row.is_favorite,
      };
    }),
  };
}
