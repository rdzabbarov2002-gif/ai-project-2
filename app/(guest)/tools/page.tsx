import { createClient } from "@/lib/supabase/server";
import { listActiveTools } from "@/lib/tools/catalog";
import { ToolGallery } from "@/components/tools/gallery/ToolGallery";

/**
 * Server Component: fetches once, passes plain data down to the client
 * component that owns interaction state (ToolGallery). Throws straight
 * through on failure — app/(guest)/tools/error.tsx is the boundary that
 * catches it, not a try/catch here; Next.js's own loading.tsx convention
 * covers the in-flight state. Both are the framework's built-in
 * mechanism for exactly what Stage 7 asked for (Loading State, Error
 * State), not a hand-rolled equivalent.
 */
export default async function ToolsGalleryPage() {
  const supabase = await createClient();
  const tools = await listActiveTools(supabase);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">Tools</h1>
      <ToolGallery tools={tools} />
    </main>
  );
}
