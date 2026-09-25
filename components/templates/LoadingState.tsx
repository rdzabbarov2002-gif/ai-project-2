/** Independent from components/tools/gallery/LoadingState.tsx — that
 *  component's text is hardcoded to "Loading tools…", not a prop, so
 *  reusing it here would show the wrong word. Used by
 *  app/(guest)/templates/loading.tsx. */
export function LoadingState() {
  return (
    <div className="rounded-md border border-ink-200 p-8 text-center text-sm text-ink-600">
      Loading templates…
    </div>
  );
}
