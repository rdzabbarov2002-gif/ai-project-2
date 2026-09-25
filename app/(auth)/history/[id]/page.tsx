import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Read-only detail view — no form, no regenerate action, nothing that
 * could be mistaken for reopening ToolRunner. Part 3 of this stage's
 * brief requires checking whether a "restore a generation into the
 * editor" mechanism already exists before building anything like it: it
 * doesn't (ToolRunner has no "load existing generation" mode, no route
 * carries a generation's saved input_params back into a form) — so none
 * is built here. This page only shows what was already saved.
 *
 * Scoped to the owner by the same RLS select policy the list page relies
 * on (migration 0008, `auth.uid() = user_id`) — a generation that
 * doesn't exist and one that belongs to someone else are indistinguishable
 * here, both resolve to `null`, same unified treatment as
 * app/(guest)/tools/[slug]/page.tsx (Stage 8) uses for "inactive" vs
 * "nonexistent" tools.
 *
 * No copy-to-clipboard action: that needs a Client Component, and
 * nothing about "view a saved result" requires one — the text is
 * selectable natively. Considered and left out rather than added for
 * parity with ToolRunner's result panel, which Stage 14 doesn't ask for.
 */
export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const supabase = createClient();

  const { data } = await supabase
    .from("generations")
    .select("id, output, created_at, tools(name), templates(name)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return (
      <main className="p-8">
        <p className="text-ink-600">This generation isn&apos;t available.</p>
      </main>
    );
  }

  // Cast, not inferred — same caveat as the list page and every other
  // embedded-select site in this project (Stage 5/8/10/14).
  const tool = data.tools as unknown as { name: string } | { name: string }[] | null;
  const template = data.templates as unknown as { name: string } | { name: string }[] | null;
  const toolRow = Array.isArray(tool) ? tool[0] : tool;
  const templateRow = Array.isArray(template) ? template[0] : template;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-ink-950">
          {toolRow?.name ?? "Unknown tool"}
        </h1>
        <div className="flex items-center gap-2 text-xs text-ink-600">
          <time dateTime={data.created_at}>{new Date(data.created_at).toLocaleString()}</time>
          {templateRow?.name && (
            <span className="rounded-sm bg-accent-subtle px-2 py-0.5 text-accent">
              {templateRow.name}
            </span>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink-950">{data.output || "(empty result)"}</p>
    </main>
  );
}
