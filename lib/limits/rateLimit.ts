import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Identity } from "@/lib/generation/identity";

const WINDOW_MS = 60_000;

/**
 * Burst protection for /api/generate (architecture doc §17: "rate limiting
 * on /api/generate … protection against abuse and AI-budget overrun").
 * Separate from the monthly allowance (checkUsage): that one caps how
 * much, this one caps how fast — a script hammering the endpoint, or a
 * double-submitting client, gets refused before any AI call is paid for.
 *
 * Counted from the caller's own `generations` rows in the last minute —
 * the table every successful generation already writes — so it needs no
 * new table and holds across serverless instances (an in-memory counter
 * wouldn't). Both lookups are covered by existing indexes (migration
 * 0008: `(user_id, created_at desc)`, and `guest_session_id`). Admin client
 * for the same reason checkUsage uses it: a guest's rows aren't readable
 * any other way.
 *
 * Fails open on a read error: this is a secondary guard, the monthly
 * allowance still applies, and refusing every generation because a count
 * query hiccuped would be the worse failure.
 */
export async function isOverRateLimit(params: {
  admin: SupabaseClient<Database>;
  identity: Identity;
  maxPerMinute: number;
  now?: Date;
}): Promise<boolean> {
  const since = new Date((params.now ?? new Date()).getTime() - WINDOW_MS).toISOString();

  let query = params.admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  query =
    params.identity.type === "user"
      ? query.eq("user_id", params.identity.userId)
      : query.eq("guest_session_id", params.identity.guestSessionId);

  const { count, error } = await query;
  if (error) {
    console.error("[rate-limit] count failed, not limiting:", error.message);
    return false;
  }
  return (count ?? 0) >= params.maxPerMinute;
}
