"use client";

import { useMessages } from "@/components/providers/LocaleProvider";

/** Independent from components/tools/gallery/EmptyState.tsx: that
 *  component's `reason` union type is literally typed to
 *  "no-tools" | "no-results" — widening it to also accept a templates
 *  reason would mean editing an already-shipped Stage 7 file with no
 *  objective need (the component's own logic isn't shared, just the
 *  three-line JSX shape is coincidentally similar). */
export function EmptyState({ reason }: { reason: "no-templates" | "no-results" }) {
  const t = useMessages();
  const message = reason === "no-templates" ? t.templates.none : t.templates.noMatches;

  return (
    <div className="rounded-md border border-dashed border-ink-200 p-8 text-center text-sm text-ink-600">
      {message}
    </div>
  );
}
