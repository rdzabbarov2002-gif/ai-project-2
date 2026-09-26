import { setFavorite } from "@/app/(auth)/history/actions";

/**
 * Star toggle for one generation. A plain <form> posting to the setFavorite
 * Server Action — works without client JavaScript, and the page re-renders
 * with the new state (the action revalidates it). Sits next to a
 * HistoryItem rather than inside it: HistoryItem is a link, and a button
 * nested in a link is invalid, unpredictable markup.
 */
export function FavoriteButton({ id, isFavorite }: { id: string; isFavorite: boolean }) {
  const label = isFavorite ? "Remove from favorites" : "Add to favorites";
  return (
    <form action={setFavorite}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="favorite" value={String(!isFavorite)} />
      <button
        type="submit"
        aria-pressed={isFavorite}
        aria-label={label}
        title={label}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 text-lg text-ink-600 transition-colors hover:border-accent hover:text-accent aria-pressed:text-accent"
      >
        <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      </button>
    </form>
  );
}
