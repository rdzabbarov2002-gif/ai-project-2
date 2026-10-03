import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { getMessages } from "@/lib/i18n/server";

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
export async function PremiumTemplateNotice({
  toolSlug,
  templateName,
}: {
  toolSlug: string;
  templateName: string;
}) {
  const t = await getMessages();
  return (
    <Card className="space-y-3 border-upgrade">
      <Badge tone="upgrade">{t.templates.proTemplate}</Badge>
      <p className="text-sm text-ink-800">{t.templates.premiumNotice(templateName)}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/settings/billing" className={buttonClasses("upgrade")}>
          {t.common.viewPlans}
        </Link>
        <Link href={`/tools/${toolSlug}`} className={buttonClasses("secondary")}>
          {t.templates.useStandard}
        </Link>
      </div>
    </Card>
  );
}
