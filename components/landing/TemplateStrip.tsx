import Link from "next/link";
import type { TemplateListItem } from "@/lib/templates/types";

/**
 * A few templates in a row that scrolls sideways on phones — free ones
 * first, so the first cards open for everyone. Each opens its tool with
 * the template chosen, like a card in the Templates library.
 */
export function TemplateStrip({ templates, limit = 8 }: { templates: TemplateListItem[]; limit?: number }) {
  const shown = [...templates].sort((a, b) => Number(a.isPremium) - Number(b.isPremium)).slice(0, limit);

  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {shown.map((template) => (
        <li key={template.slug} className="w-[200px] shrink-0 snap-start">
          <Link
            href={`/tools/${template.toolSlug}?template=${template.slug}`}
            className="flex h-full flex-col rounded-lg bg-surface p-4 shadow-sm ring-1 ring-ink-200/60 transition-colors hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[11.5px] font-bold uppercase tracking-wider text-ink-600">
                {template.category}
              </span>
              {template.isPremium && (
                <span className="rounded-sm bg-upgrade-subtle px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase text-upgrade-ink">
                  Pro
                </span>
              )}
            </span>
            <span className="mt-2 font-extrabold leading-snug text-ink-950">{template.name}</span>
            <span className="mt-1 text-[13px] text-ink-600">{template.toolName}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
