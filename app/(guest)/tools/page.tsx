import { createClient } from "@/lib/supabase/server";
import { listActiveTools } from "@/lib/tools/catalog";
import { ToolGallery } from "@/components/tools/gallery/ToolGallery";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeTool } from "@/lib/i18n/catalog";

import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata(
  "AI marketing tools",
  "Ad, email, social post, landing page and article generators that write for your business. Try any tool free, no sign-up needed.",
  "/tools",
);

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
  const [tools, locale, t] = await Promise.all([listActiveTools(supabase), getLocale(), getMessages()]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">{t.tools.title}</h1>
      <ToolGallery tools={tools.map((tool) => localizeTool(tool, locale))} />
    </main>
  );
}
