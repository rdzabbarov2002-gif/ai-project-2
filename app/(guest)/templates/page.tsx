import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/templates/catalog";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeTemplate } from "@/lib/i18n/catalog";

import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata(
  "Marketing templates",
  "Ready-made templates for ads, emails, social posts and more — pick one, fill in a few fields, get copy written for your business.",
  "/templates",
);

/**
 * Same shape as app/(guest)/tools/page.tsx (Stage 7): fetch once
 * server-side, hand plain data to the client component that owns
 * interaction state. Throws straight through to
 * app/(guest)/templates/error.tsx on failure; loading.tsx covers the
 * in-flight state — both Next.js's own convention, not hand-rolled.
 */
export default async function TemplatesLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const supabase = await createClient();
  const [templates, { q }, locale, t] = await Promise.all([listTemplates(supabase), searchParams, getLocale(), getMessages()]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">{t.templates.title}</h1>
      {/* `q`: the search box on the landing page lands here with its words. */}
      <TemplateGallery templates={templates.map((template) => localizeTemplate(template, locale))} initialSearch={typeof q === "string" ? q : ""} />
    </main>
  );
}
