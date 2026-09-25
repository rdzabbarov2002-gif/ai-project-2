/**
 * Shape the Tools Gallery renders against. A deliberate subset of the
 * `tools` row — exactly the six fields Stage 7 named (slug, name,
 * description, icon, category, is_active), minus `is_active` itself:
 * the RLS policy on `tools` (migration 0006) already filters to
 * `is_active = true` for anyone without elevated access, so a row this
 * type describes is *always* active by construction. Carrying the flag
 * here would invite a component to branch on it redundantly.
 */
export interface ToolListItem {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
}
