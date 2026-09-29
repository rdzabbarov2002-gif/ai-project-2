"use client";

import { useMessages } from "@/components/providers/LocaleProvider";
import { Skeleton } from "@/components/ui/Skeleton";

/** Independent from components/tools/gallery/LoadingState.tsx (its
 *  screen-reader text says "tools"). Stage 14: skeleton cards in the
 *  library's grid. Used by app/(guest)/templates/loading.tsx. */
export function LoadingState() {
  const t = useMessages();
  return (
    <div className="space-y-4">
      <p className="sr-only" role="status">
        {t.templates.loading}
      </p>
      <Skeleton className="h-10 w-full sm:max-w-xs" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
