import { Skeleton } from "@/components/ui/Skeleton";
import { getMessages } from "@/lib/i18n/server";

/**
 * Inline, not a separate LoadingState component — the Tools/Templates
 * galleries (Stage 7/10) each have their own; Stage 13 chose not to add
 * more. Stage 14 swaps the text for skeletons shaped like the page.
 */
export default async function DashboardLoading() {
  const t = await getMessages();
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <p className="sr-only" role="status">
        {t.dashboard.loading}
      </p>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-32 max-w-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </main>
  );
}
