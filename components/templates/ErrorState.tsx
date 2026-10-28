"use client";

import { useMessages } from "@/components/providers/LocaleProvider";

/** Independent from components/tools/gallery/ErrorState.tsx for the same
 *  reason as LoadingState.tsx above (hardcoded "tools" text). Rendered
 *  by app/(guest)/templates/error.tsx when listTemplates() throws a
 *  TemplateCatalogError — message stays generic on purpose, same
 *  reasoning as every other error boundary in this project (Stage 5's
 *  route.ts, Stage 7's tools ErrorState). */
export function ErrorState() {
  const t = useMessages();
  return (
    <div className="rounded-md border border-danger p-8 text-center text-sm text-danger">
      {t.templates.loadError}
    </div>
  );
}
