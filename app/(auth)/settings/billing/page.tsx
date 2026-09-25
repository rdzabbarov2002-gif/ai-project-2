import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolvePlanLimits } from "@/lib/generation/plan";
import { currentMonthPeriod } from "@/lib/generation/period";
import { UsageCard } from "@/components/usage/UsageCard";

/**
 * Same data-fetching shape as the Dashboard (Stage 13) — considered and
 * deliberately NOT extracted into a shared helper. The two pages aren't
 * actually identical (this one also reads `subscriptions.status`, the
 * Dashboard doesn't), and Stage 10's audit already reasoned through this
 * exact tradeoff for a different pair of similar-but-not-identical
 * functions (lib/tools/query.ts vs lib/templates/query.ts): two small,
 * independent reads that are free to diverge beat one shared abstraction
 * built for two call sites that already differ. No Stripe/payment/
 * webhook logic here — explicitly out of scope for this stage; this page
 * only reads and displays what already exists.
 */
export default async function BillingSettingsPage() {
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

  // `subscriptions` allows a per-user history in principle (Stage 3);
  // most recent row is "the" current one, same tie-breaker already used
  // for company_profiles (Stage 12) and templates (Stage 7/10).
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const used = usage?.generations_count ?? 0;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">Billing & Plan</h1>
      <UsageCard
        planSlug={planLimits.planSlug}
        status={subscription?.status}
        used={used}
        limit={planLimits.maxGenerationsPerMonth}
      />
    </main>
  );
}
