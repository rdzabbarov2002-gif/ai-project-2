import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveUsageSummary } from "@/lib/limits/usageSummary";
import { listActiveTools } from "@/lib/tools/catalog";
import { listUserGenerations } from "@/lib/history/generations";
import { UsageCard } from "@/components/usage/UsageCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ToolGrid } from "@/components/tools/gallery/ToolGrid";
import { HistoryItem } from "@/components/history/HistoryItem";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";

const RECENT_COUNT = 5;

/**
 * Dashboard. Stage 13 built it as the usage card plus sign-out; the
 * architecture doc's spec for this screen (§9) is "quick access, recent
 * generations, limit status", which Stage 13's completion fills in —
 * entirely from reads that already exist elsewhere:
 *  - usage: resolveUsageSummary (shared with Billing and the tool page),
 *  - quick access: listActiveTools + ToolGrid, the Tools Gallery's own,
 *  - recent: listUserGenerations + HistoryItem, the History page's own,
 *  - a nudge to /onboarding while the user has no company profile
 *    (§8: onboarding comes before the Dashboard for a draft profile —
 *    skippable, so the Dashboard keeps offering it).
 * All four run in parallel; nothing here writes.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [summary, tools, recent, { count: profileCount }] = await Promise.all([
    resolveUsageSummary(supabase, user.id),
    listActiveTools(supabase),
    listUserGenerations(supabase, user.id, { limit: RECENT_COUNT }),
    supabase
      .from("company_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-ink-950">Dashboard</h1>
        <SignOutButton />
      </div>

      {!profileCount && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-medium text-ink-950">Add your company profile</h2>
            <p className="text-sm text-ink-600">
              Every tool tailors its results to it — takes about a minute.
            </p>
          </div>
          <Link href="/onboarding" className={buttonClasses("primary", "shrink-0")}>
            Set it up
          </Link>
        </Card>
      )}

      <div className="max-w-2xl">
        <UsageCard
          planSlug={summary.planLimits.planSlug}
          used={summary.used}
          limit={summary.planLimits.maxGenerationsPerMonth}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium text-ink-950">Start creating</h2>
          <Link href="/templates" className="text-sm text-accent hover:underline">
            Browse templates →
          </Link>
        </div>
        <ToolGrid tools={tools} />
      </section>

      <section className="max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium text-ink-950">Recent generations</h2>
          {recent.items.length > 0 && (
            <Link href="/history" className="text-sm text-accent hover:underline">
              View all →
            </Link>
          )}
        </div>
        {recent.items.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-200 p-6 text-center text-sm text-ink-600">
            Nothing yet — pick a tool above to create your first result.
          </div>
        ) : (
          <div className="space-y-3">
            {recent.items.map((generation) => (
              <HistoryItem key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
