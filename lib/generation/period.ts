/**
 * Usage tracked per calendar month (UTC) — simple, predictable, matches
 * how the Free/Pro plan copy ("500 generations/month") will read on a
 * future billing page. A rolling 30-day window would be marginally fairer
 * at the edges but harder to explain and harder to reconcile against a
 * calendar-month Stripe billing cycle later — not worth the complexity
 * this stage doesn't need yet.
 */
export interface UsagePeriod {
  start: string; // YYYY-MM-DD, matches usage_counters.period_start (date column)
  end: string; // YYYY-MM-DD, exclusive
}

export function currentMonthPeriod(now: Date = new Date()): UsagePeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return { start: toDateString(start), end: toDateString(end) };
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
