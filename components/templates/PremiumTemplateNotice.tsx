import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

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
      <Badge tone="upgrade">Pro template</Badge>
      <p className="text-sm text-ink-800">
        &ldquo;{templateName}&rdquo; is part of the Pro plan&apos;s template library. Your
        current plan includes the standard template for this tool.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/settings/billing" className={buttonClasses("upgrade")}>
          View plans
        </Link>
        <Link href={`/tools/${toolSlug}`} className={buttonClasses("secondary")}>
          Use the standard template
        </Link>
      </div>
    </Card>
  );
}
