import { Card } from "@/components/ui/Card";

/**
 * Pure presentational — no data fetching, no hooks, no "use client"
 * (nothing here is interactive). Both consumers (Dashboard, Settings/
 * Billing) already resolve their own data via the existing
 * `resolvePlanLimits` (Stage 5) plus a direct, RLS-permitted read of
 * their own `usage_counters` row — this component's only job is
 * rendering what they hand it, which is exactly one responsibility.
 *
 * `planSlug` typed as its own inline union rather than importing
 * `PlanLimits["planSlug"]` from lib/generation/plan.ts: consistent with
 * how components/profile/CompanyProfileForm.tsx (Stage 12) chose to
 * shape its own props rather than import a pipeline-internal type — a
 * presentational component's contract shouldn't shift silently if an
 * unrelated pipeline type changes shape for pipeline reasons.
 */
export interface UsageCardProps {
  planSlug: "free" | "pro" | "enterprise";
  used: number;
  /** null = unlimited (mirrors PlanLimits.maxGenerationsPerMonth's own
   *  null-means-unlimited convention, Stage 5) — kept as the same
   *  sentinel rather than a boolean flag, so callers pass through what
   *  resolvePlanLimits already gave them without translating it. */
  limit: number | null;
}

const PLAN_LABELS: Record<UsageCardProps["planSlug"], string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function UsageCard({ planSlug, used, limit }: UsageCardProps) {
  const isUnlimited = limit === null;
  const remaining = isUnlimited ? null : Math.max(0, limit - used);
  const percentage = isUnlimited
    ? 0
    : limit === 0
      ? 100
      : Math.min(100, Math.round((used / limit) * 100));

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink-950">Plan: {PLAN_LABELS[planSlug]}</h2>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-ink-600">Used</dt>
          <dd className="font-medium text-ink-950">{used}</dd>
        </div>
        <div>
          <dt className="text-ink-600">Limit</dt>
          <dd className="font-medium text-ink-950">{isUnlimited ? "Unlimited" : limit}</dd>
        </div>
        <div>
          <dt className="text-ink-600">Remaining</dt>
          <dd className="font-medium text-ink-950">{isUnlimited ? "Unlimited" : remaining}</dd>
        </div>
      </dl>

      {/* No computations, no bar, when unlimited — per Stage 13's brief
          literally: "if the limit is unlimited, show Unlimited without
          computing percentages." */}
      {!isUnlimited && (
        <div className="h-2 w-full overflow-hidden rounded-sm bg-ink-200">
          <div className="h-full bg-accent" style={{ width: `${percentage}%` }} />
        </div>
      )}
    </Card>
  );
}
