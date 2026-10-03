"use client";

import { useMessages } from "@/components/providers/LocaleProvider";
import { Skeleton } from "@/components/ui/Skeleton";

/** Stage 14 polish: a card-grid skeleton in the gallery's own layout
 *  instead of a line of text (Stage 7 left the visual treatment for this
 *  stage). The text stays, for screen readers. Used by
 *  app/(guest)/tools/loading.tsx. */
export function LoadingState() {
  const t = useMessages();
  return (
    <div className="space-y-4">
      <p className="sr-only" role="status">
        {t.tools.loading}
      </p>
      <Skeleton className="h-10 w-full sm:max-w-xs" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
