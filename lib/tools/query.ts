import type { ToolListItem } from "./types";

/**
 * Extensible now, not "extended later by editing this line" — widen this
 * union when a new sort actually ships (popularity needs a usage count
 * somewhere to sort by; newest/updated need created_at/updated_at on
 * ToolListItem, which it doesn't carry today because nothing renders
 * them yet). Adding one is: widen this type, add one branch in
 * `sortTools`, nothing in any component changes.
 */
export type ToolSortOption = "name";

export interface ToolQueryParams {
  search?: string;
  /** null/undefined = no category filter (show everything). */
  category?: string | null;
  sortBy?: ToolSortOption;
}

/**
 * The boundary Stage 7's "move search to the server later without
 * rewriting components" requirement is built around. Every caller
 * (ToolGallery today) passes the *same* `{ tools, params }` shape it
 * would pass to a server version of this function — swapping the body
 * for `await fetch("/api/tools?...")` later is a change to this one
 * file, not to ToolGallery, SearchBar, CategoryFilter, or ToolCard.
 *
 * Runs in memory deliberately for now: Stage 7's own scope note says so
 * explicitly ("if the dataset is small, search/filter may run in
 * memory"), and the current catalog is a handful of rows fetched in one
 * request by `listActiveTools()` — there's nothing to optimize yet.
 */
export function queryTools(tools: ToolListItem[], params: ToolQueryParams): ToolListItem[] {
  let result = tools;

  const search = params.search?.trim().toLowerCase();
  if (search) {
    result = result.filter(
      (tool) =>
        tool.name.toLowerCase().includes(search) ||
        (tool.description ?? "").toLowerCase().includes(search),
    );
  }

  if (params.category) {
    result = result.filter((tool) => tool.category === params.category);
  }

  return sortTools(result, params.sortBy ?? "name");
}

function sortTools(tools: ToolListItem[], sortBy: ToolSortOption): ToolListItem[] {
  const sorted = [...tools];

  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return sorted;
}

/**
 * Categories are never a hand-maintained list — they're whatever distinct
 * `category` values actually exist in the data right now. A new category
 * appearing in the `tools` table (any future stage, no code change) shows
 * up here automatically the next time this runs.
 */
export function deriveCategories(tools: ToolListItem[]): string[] {
  const categories = new Set<string>();
  for (const tool of tools) {
    if (tool.category) categories.add(tool.category);
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}
