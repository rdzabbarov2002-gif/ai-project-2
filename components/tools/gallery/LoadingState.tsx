/** Deliberately plain text, not a skeleton/spinner — Stage 7 explicitly
 *  scopes out "visual design," and a skeleton loader is a design
 *  decision, not an architectural one. Used by app/(guest)/tools/loading.tsx,
 *  which Next.js renders automatically while the gallery page's data
 *  fetch is in flight. */
export function LoadingState() {
  return (
    <div className="rounded-md border border-ink-200 p-8 text-center text-sm text-ink-600">
      Loading tools…
    </div>
  );
}
