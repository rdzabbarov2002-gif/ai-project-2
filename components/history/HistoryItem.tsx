import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

const PREVIEW_LENGTH = 140;

/**
 * One row's presentation — same role as ToolCard/TemplateCard (Stage
 * 7/10): a small, single-purpose component the list page maps over,
 * owning none of the data-fetching itself. No "status" field: the task
 * asks for one only "if already stored," and `generations` has no such
 * column (confirmed against migration 0008 before writing this) — there
 * is nothing to display, so nothing is rendered for it, rather than a
 * hardcoded "completed" that would just be decorative.
 *
 * Links to `/history/{id}` — a read-only detail view (this stage), not a
 * route back into ToolRunner: Part 3 of this stage's brief is explicit
 * that "open" means viewing the record, not reopening the editor, and no
 * mechanism for the latter exists anywhere in the project to reuse.
 */
export async function HistoryItem({
  generation,
}: {
  generation: {
    id: string;
    toolName: string;
    templateName: string | null;
    createdAt: string;
    output: string;
  };
}) {
  const [locale, t] = await Promise.all([getLocale(), getMessages()]);
  const preview =
    generation.output.length > PREVIEW_LENGTH
      ? `${generation.output.slice(0, PREVIEW_LENGTH)}…`
      : generation.output;

  return (
    <Link href={`/history/${generation.id}`} className="block">
      <Card className="space-y-1 transition-colors hover:border-accent">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium text-ink-950">{generation.toolName}</h3>
          <time className="shrink-0 text-xs text-ink-600" dateTime={generation.createdAt}>
            {new Date(generation.createdAt).toLocaleDateString(INTL_LOCALE[locale], { timeZone: "UTC" })}
          </time>
        </div>
        {generation.templateName && <Badge>{generation.templateName}</Badge>}
        <p className="text-sm text-ink-600">{preview || t.common.emptyResult}</p>
      </Card>
    </Link>
  );
}
