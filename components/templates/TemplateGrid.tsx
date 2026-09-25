import type { TemplateListItem } from "@/lib/templates/types";
import { TemplateCard } from "./TemplateCard";

/** Pure layout, same shape as components/tools/gallery/ToolGrid.tsx
 *  (Stage 7) — not shared, for the same reason lib/templates/query.ts
 *  isn't: the two render different item shapes and are free to diverge. */
export function TemplateGrid({ templates }: { templates: TemplateListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard key={template.slug} template={template} />
      ))}
    </div>
  );
}
