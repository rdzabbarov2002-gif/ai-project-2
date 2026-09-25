import type { TemplateListItem } from "./types";

/**
 * Deliberately NOT sharing an abstraction with lib/tools/query.ts
 * (Stage 7), even though the two functions are structurally similar
 * (filter by search text, filter by category, sort by name). Considered
 * and rejected: extracting a shared generic utility would mean either
 * refactoring lib/tools/query.ts to use it — touching already-shipped,
 * already-audited Stage 7 code with no objective need this stage — or
 * building the shared utility only for this file to use, leaving two
 * different patterns for conceptually similar logic, which is worse than
 * two small independent ones. The search fields also genuinely differ
 * (name+description for tools, name+category for templates — templates
 * has no description column) and the two are free to diverge further
 * later (templates might filter by is_premium; tools might not) without
 * dragging a shared abstraction along. Same reasoning Stage 7 used to
 * justify lib/tools/ existing alongside lib/generation/catalog.ts in the
 * first place: reuse the *pattern*, not force-share the *code*.
 */
export type TemplateSortOption = "name";

export interface TemplateQueryParams {
  search?: string;
  category?: string | null;
  sortBy?: TemplateSortOption;
}

export function queryTemplates(
  templates: TemplateListItem[],
  params: TemplateQueryParams,
): TemplateListItem[] {
  let result = templates;

  const search = params.search?.trim().toLowerCase();
  if (search) {
    result = result.filter(
      (template) =>
        template.name.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search),
    );
  }

  if (params.category) {
    result = result.filter((template) => template.category === params.category);
  }

  return sortTemplates(result, params.sortBy ?? "name");
}

function sortTemplates(
  templates: TemplateListItem[],
  sortBy: TemplateSortOption,
): TemplateListItem[] {
  const sorted = [...templates];

  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return sorted;
}

/** `category` is NOT NULL on `templates` (unlike `tools.category`, which
 *  is nullable) — no filtering-out-empty-values step needed here that
 *  lib/tools/query.ts's deriveCategories has to do. */
export function deriveCategories(templates: TemplateListItem[]): string[] {
  const categories = new Set<string>();
  for (const template of templates) {
    categories.add(template.category);
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}
