/**
 * Shape the Templates Library renders against. Mirrors the reasoning of
 * lib/tools/types.ts's ToolListItem exactly (Stage 7): only the fields a
 * card and a link actually need, nothing carried "in case it's useful."
 *
 * `toolSlug`/`toolName` (not `toolId`) because the only thing a template
 * card does with its owning tool is link to `/tools/{slug}` and show the
 * tool's name — an id would be dead weight here, same reasoning that kept
 * `id` off ToolListItem.
 *
 * No `description`: `templates` has no such column (unlike `tools`,
 * which gained one in Stage 7) and Stage 10's brief never asked for one
 * for templates specifically — name + category + source tool is enough
 * for a card, so adding a column for it would be exactly the kind of
 * unrequested, ungrounded schema change this stage is told to avoid.
 */
export interface TemplateListItem {
  slug: string;
  name: string;
  category: string;
  toolSlug: string;
  toolName: string;
}
