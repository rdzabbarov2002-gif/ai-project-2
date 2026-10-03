import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
            <Badge tone="upgrade" className="shrink-0">
              Pro
            </Badge>
          )}
        </div>
        <Badge>{template.category}</Badge>
        <p className="text-xs text-ink-600">{template.toolName}</p>
      </Card>
    </Link>
  );
}
