"use client";

import { useMessages } from "@/components/providers/LocaleProvider";

/** Rendered by app/(guest)/tools/error.tsx when listActiveTools() throws
 *  a ToolCatalogError — the message stays generic on purpose (no DB
 *  error text), same reasoning as app/api/generate/route.ts not leaking
 *  provider/DB errors to the client (Stage 5). */
export function ErrorState() {
  const t = useMessages();
  return (
    <div className="rounded-md border border-danger p-8 text-center text-sm text-danger">
      {t.tools.loadError}
    </div>
  );
}
