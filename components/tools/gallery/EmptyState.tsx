/** Same component for both cases Stage 7 asked for — an empty catalog
 *  and a search/filter with no matches — just a different message,
 *  rather than two near-identical components. */
export function EmptyState({ reason }: { reason: "no-tools" | "no-results" }) {
  const message =
    reason === "no-tools"
      ? "No tools are available yet — check back soon."
      : "No tools match your search or filter.";

  return (
    <div className="rounded-md border border-dashed border-ink-200 p-8 text-center text-sm text-ink-600">
      {message}
    </div>
  );
}
