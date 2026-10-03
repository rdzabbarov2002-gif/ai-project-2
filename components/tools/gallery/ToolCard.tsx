import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ToolListItem } from "@/lib/tools/types";

/**
 * Renders only the six fields Stage 7 named — no branching on `tool.slug`
 * or any other tool-specific identity. A tool with no icon/category/
 * description (nothing seeded yet beyond the three Stage 3 placeholders)
 * still renders a valid card; those sections just don't appear.
 */
export function ToolCard({ tool }: { tool: ToolListItem }) {
  return (
    <Link href={`/tools/${tool.slug}`} className="block h-full">
      <Card className="h-full space-y-2 transition-colors hover:border-accent">
        <div className="flex items-center gap-2">
          {tool.icon && (
            <span aria-hidden="true" className="text-lg">
              {tool.icon}
            </span>
          )}
          <h3 className="font-medium text-ink-950">{tool.name}</h3>
        </div>
        {tool.category && <Badge>{tool.category}</Badge>}
        {tool.description && <p className="text-sm text-ink-600">{tool.description}</p>}
      </Card>
    </Link>
  );
}
