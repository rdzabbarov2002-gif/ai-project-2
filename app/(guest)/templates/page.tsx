import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/templates/catalog";
import { TemplateGallery } from "@/components/templates/TemplateGallery";

/**
 * Same shape as app/(guest)/tools/page.tsx (Stage 7): fetch once
 * server-side, hand plain data to the client component that owns
 * interaction state. Throws straight through to
 * app/(guest)/templates/error.tsx on failure; loading.tsx covers the
 * in-flight state — both Next.js's own convention, not hand-rolled.
 */
export default async function TemplatesLibraryPage() {
  const supabase = await createClient();
  const templates = await listTemplates(supabase);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">Templates</h1>
      <TemplateGallery templates={templates} />
    </main>
  );
}
