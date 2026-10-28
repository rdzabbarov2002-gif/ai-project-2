import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Two deletes; a backlog after downtime may take a while. */
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Nightly clean-up (vercel.json) of what the app keeps only for a while,
 * as the Privacy Policy says:
 * - guest sessions past their expiry — 30 days after last use
 *   (config/settings.ts) — and with them their generations (the foreign
 *   key cascades, migration 0008);
 * - rate-limit records older than a day (migration 0027), the longest
 *   any limit looks back.
 *
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const sessions = await admin
    .from("guest_sessions")
    .delete({ count: "exact" })
    .lt("expires_at", new Date(now).toISOString());
  const events = await admin
    .from("rate_limit_events")
    .delete({ count: "exact" })
    .lt("created_at", new Date(now - DAY_MS).toISOString());

  const error = sessions.error ?? events.error;
  if (error) {
    logger.error("purge: deleting expired data failed", { error });
    return NextResponse.json({ error: "Purge failed." }, { status: 500 });
  }

  const deleted = {
    guestSessions: sessions.count ?? 0,
    rateLimitEvents: events.count ?? 0,
  };
  logger.info("purge: expired data deleted", deleted);
  return NextResponse.json(deleted);
}
