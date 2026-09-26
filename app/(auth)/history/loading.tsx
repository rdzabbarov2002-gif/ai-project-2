import { Skeleton } from "@/components/ui/Skeleton";

/** Inline, not a separate LoadingState component (Stage 13's reasoning);
 *  Stage 14 swaps the text for skeleton rows shaped like the list. */
export default function HistoryLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-3 p-6">
      <p className="sr-only" role="status">
        Loading history…
      </p>
      <Skeleton className="h-7 w-32" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </main>
  );
}
