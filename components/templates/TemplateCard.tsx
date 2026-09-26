import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { TemplateListItem } from "@/lib/templates/types";

/**
 * Links to `/tools/{toolSlug}?template={slug}` — the tool page (Stage 6/8,
 * updated this stage) resolves that query param via the exact same
 * resolveTemplate() the generation pipeline already uses (Stage 5), so
 * picking a template here actually changes what gets generated, not just
 * which page you land on.
 */
export function TemplateCard({ template }: { template: TemplateListItem }) {
  return (
    <Link href={`/tools/${template.toolSlug}?template=${template.slug}`} className="block h-full">
      <Card className="h-full space-y-2 transition-colors hover:border-accent">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-ink-950">{template.name}</h3>
          {template.isPremium && (
            <span className="shrink-0 rounded-sm bg-upgrade-subtle px-2 py-0.5 text-xs font-medium text-ink-950">
              Pro
            </span>
          )}
        </div>
        <span className="inline-block rounded-sm bg-accent-subtle px-2 py-0.5 text-xs text-accent">
          {template.category}
        </span>
        <p className="text-xs text-ink-600">{template.toolName}</p>
      </Card>
    </Link>
  );
}
