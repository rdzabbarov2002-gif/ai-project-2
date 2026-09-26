/**
 * An embedded relation (`select("…, tools(name)")`) as PostgREST may
 * return it: an object for a to-one relation, an array otherwise, or
 * null. database.types.ts is hand-written, so embed sites cast to this
 * and normalize with `firstEmbed` rather than trusting inference blindly
 * (the pattern lib/generation/plan.ts has used since Stage 5).
 */
export type Embed<T> = T | T[] | null;

/** One-row view of an embed, whichever shape it came back in. */
export function firstEmbed<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
