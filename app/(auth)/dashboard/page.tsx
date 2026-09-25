import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolvePlanLimits } from "@/lib/generation/plan";
import { currentMonthPeriod } from "@/lib/generation/period";
import { UsageCard } from "@/components/usage/UsageCard";
import { SignOutButton } from "@/components/auth/SignOutButton";

/**
 * Reuses `resolvePlanLimits` (Stage 5) unchanged — this page's entire
 * plan/limit knowledge comes from calling it, not from re-deriving
 * anything about plans here. The generations-used count is read directly
 * from `usage_counters` via the existing user-scoped client: that table
 * already has a `select` RLS policy for the owning user (migration 0007,
 * written with exactly this kind of read in mind — "a usage indicator...
 * can read this directly without a dedicated API route"), so no new
 * access path is created. Deliberately not calling `checkUsage()`
 * (Stage 5): that function needs the admin client and answers a
 * different question — "may this specific tool run right now" — not "how
 * much has been used this period," which is what this page displays.
 *
 * `SignOutButton` (Stage 2) is rendered here for the first time — this
 * is the page Stage 9's audit named as where it belonged once a stage
 * "naturally starts working with Dashboard." Stage 13 is that stage.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createClient();

  const planLimits = await resolvePlanLimits(supabase, { type: "user", userId: user.id });
  const period = currentMonthPeriod();

  const { data: usage } = await supabase
    .from("usage_counters")
    .select("generations_count")
    .eq("user_id", user.id)
    .eq("period_start", period.start)
    .maybeSingle();

  const used = usage?.generations_count ?? 0;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink-950">Dashboard</h1>
        <SignOutButton />
      </div>
      <UsageCard planSlug={planLimits.planSlug} used={used} limit={planLimits.maxGenerationsPerMonth} />
    </main>
  );
}
