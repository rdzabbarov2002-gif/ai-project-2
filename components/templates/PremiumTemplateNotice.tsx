import Link from "next/link";
import { Card } from "@/components/ui/Card";

/**
 * Shown on a tool page in place of the form when the requested template
 * is `is_premium` and the visitor's plan doesn't include premium
 * templates (plan_limits.premium_templates, Stage 10). Purely
 * presentational — the page decides whether to render it, and
 * /api/generate enforces the same rule server-side regardless (checkUsage),
 * so this is the explanation, not the gate.
 *
 * Amber (`upgrade`) styling per config/design-tokens.md: that color is
 * reserved for exactly this kind of plan-limit moment.
 */
export function PremiumTemplateNotice({
  toolSlug,
  templateName,
}: {
  toolSlug: string;
  templateName: string;
}) {
  return (
    <Card className="space-y-3 border-upgrade">
      <span className="inline-block rounded-sm bg-upgrade-subtle px-2 py-0.5 text-xs font-medium text-ink-950">
        Pro template
      </span>
      <p className="text-sm text-ink-800">
        &ldquo;{templateName}&rdquo; is part of the Pro plan&apos;s template library. Your
        current plan includes the standard template for this tool.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/settings/billing"
          className="rounded-md bg-upgrade px-4 py-2 font-medium text-white hover:bg-upgrade-hover"
        >
          View plans
        </Link>
        <Link
          href={`/tools/${toolSlug}`}
          className="rounded-md border border-ink-200 px-4 py-2 font-medium text-ink-950 hover:bg-ink-200"
        >
          Use the standard template
        </Link>
      </div>
    </Card>
  );
}
