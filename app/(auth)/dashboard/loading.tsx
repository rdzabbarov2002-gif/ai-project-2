/**
 * Inline, not a separate LoadingState component: the existing
 * Tools/Templates galleries (Stage 7/10) each have their own
 * near-identical LoadingState/ErrorState pair already — a third and
 * fourth pair here would compound a duplication this stage's brief asks
 * to flag, not add to (see Stage 13 audit §4). One line of markup with no
 * other consumer doesn't earn a file of its own.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-md border border-ink-200 p-8 text-center text-sm text-ink-600">
        Loading dashboard…
      </div>
    </main>
  );
}
