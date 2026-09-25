/** Inline text, not a separate LoadingState component — same reasoning
 *  as app/(auth)/dashboard/loading.tsx (Stage 13): this project already
 *  has two near-identical LoadingState/ErrorState pairs (Tools,
 *  Templates); a fifth and sixth one-line component would compound that
 *  rather than help. */
export default function HistoryLoading() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-md border border-ink-200 p-8 text-center text-sm text-ink-600">
        Loading history…
      </div>
    </main>
  );
}
