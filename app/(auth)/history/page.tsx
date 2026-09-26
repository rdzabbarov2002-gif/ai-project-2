import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { HistoryItem } from "@/components/history/HistoryItem";

const PAGE_SIZE = 10;

/**
 * Direct query against `generations`, same access pattern as every other
 * (auth) page (profile, dashboard, settings/billing) — RLS's existing
 * `auth.uid() = user_id` select policy (migration 0008) is the only gate
 * needed; no new policy, no admin client, no API route. `user_id` is
 * always the filter (never `guest_session_id`): this page is under the
 * `(auth)` group, which only ever serves signed-in requests, and guest
 * generations are reassigned to `user_id` on merge (Stage 11) before a
 * person could ever reach here — no guest-specific branch to write.
 *
 * Joins `tools(name)`/`templates(name)` in the one query rather than
 * calling `resolveTool()`/`resolveTemplate()` per row: those functions
 * take a slug, not the `tool_id`/`template_id` this table actually
 * stores, and calling either per row would mean N+1 queries for what a
 * single embedded select already answers in one round trip — the same
 * reasoning Stage 10 used for lib/templates/catalog.ts's `listTemplates()`
 * over reusing the pipeline's single-row resolvers.
 *
 * Pagination: offset-based via `?page=`, the same "read an optional
 * searchParams prop" pattern already used for `?template=` (Stage 10) —
 * no cursor, no total count. Fetches PAGE_SIZE + 1 rows and checks
 * whether the extra one came back to decide if a "Next" link is needed,
 * rather than a separate COUNT(*) query — minimal, not built for a scale
 * this project doesn't have yet (first pagination in the project; no
 * existing mechanism to extend, per the pre-implementation check in this
 * stage's audit).
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const user = await requireUser();
  const supabase = createClient();

  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data } = await supabase
    .from("generations")
    .select("id, output, created_at, tools(name), templates(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  const rows = data ?? [];
  const hasNextPage = rows.length > PAGE_SIZE;
  const generations = rows.slice(0, PAGE_SIZE).map((row) => {
    // Cast kept on purpose even though database.types.ts now carries
    // `Relationships` (Phase 1): it's still hand-written, not generated,
    // so the object-vs-array shape of an embed is normalized here rather
    // than trusted blindly (same pattern as lib/generation/plan.ts and
    // lib/templates/catalog.ts).
    const tool = row.tools as unknown as { name: string } | { name: string }[] | null;
    const template = row.templates as unknown as { name: string } | { name: string }[] | null;
    const toolRow = Array.isArray(tool) ? tool[0] : tool;
    const templateRow = Array.isArray(template) ? template[0] : template;

    return {
      id: row.id,
      output: row.output,
      createdAt: row.created_at,
      toolName: toolRow?.name ?? "Unknown tool",
      templateName: templateRow?.name ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">History</h1>

      {generations.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-200 p-8 text-center text-sm text-ink-600">
          No generations yet — results you create will show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((generation) => (
            <HistoryItem key={generation.id} generation={generation} />
          ))}
        </div>
      )}

      {(page > 1 || hasNextPage) && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/history?page=${page - 1}`} className="text-accent hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage && (
            <Link href={`/history?page=${page + 1}`} className="text-accent hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
