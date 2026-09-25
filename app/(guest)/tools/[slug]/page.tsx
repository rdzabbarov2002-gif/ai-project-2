import { createClient } from "@/lib/supabase/server";
import { resolveTool, resolveTemplate, resolveDefaultTemplate } from "@/lib/generation/catalog";
import { parseToolConfigSchema } from "@/lib/tool-config/validate";
import { ToolRunner } from "@/components/tools/ToolRunner";

/**
 * Reuses Stage 5's `resolveTool` (lib/generation/catalog.ts) rather than
 * re-querying `tools` here — same lookup /api/generate already relies on,
 * including the property this page depends on just as much: an inactive
 * tool and a nonexistent slug resolve identically (both `null`), because
 * the `tools` RLS policy already filters to `is_active = true`. One
 * lookup implementation, two callers.
 *
 * Template resolution (Stage 8, extended Stage 10): an explicit
 * `?template=` query param — as the Templates Library's TemplateCard now
 * links with — takes a specific template via `resolveTemplate`, the same
 * function /api/generate already uses; with no param, this falls back to
 * `resolveDefaultTemplate` exactly as it did before Stage 10 existed. An
 * invalid/stale `?template=` (wrong tool, deleted template) resolves to
 * `null` rather than silently substituting the default — a broken link
 * degrades to the tool's generic no-template prompt (ToolRunner's
 * existing, Stage 5-established fallback), not to different content than
 * what the link implied.
 */
export default async function ToolPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { template?: string };
}) {
  const supabase = createClient();
  const tool = await resolveTool(supabase, params.slug);

  if (!tool) {
    return (
      <main className="p-8">
        <p className="text-ink-600">This tool isn&apos;t available.</p>
      </main>
    );
  }

  const template = searchParams.template
    ? await resolveTemplate(supabase, searchParams.template, tool.id)
    : await resolveDefaultTemplate(supabase, tool.id);
  const schema = parseToolConfigSchema(tool.configSchema);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">{tool.name}</h1>
      <ToolRunner
        tool={{ slug: tool.slug, name: tool.name }}
        templateSlug={template?.slug}
        schema={schema}
      />
    </main>
  );
}
