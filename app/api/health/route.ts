import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Longer than this and the database counts as down for this check. */
const DATABASE_TIMEOUT_MS = 3000;

/**
 * For the uptime monitor (docs/production.md): 200 when the app is
 * serving and can read its database, 503 otherwise. The database is
 * read the way a visitor's page reads it — the public anon key, the
 * public `plans` table — so no privileged key is used by an endpoint
 * anyone can call. The AI provider isn't checked: calling it costs money,
 * and when it's down pages still work (docs/runbook.md, "AI is down").
 *
 * The answer says nothing beyond up or down and the deployed commit.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "down" = "ok";
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error } = await supabase
      .from("plans")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(DATABASE_TIMEOUT_MS));
    if (error) throw error;
  } catch (error) {
    database = "down";
    logger.warn("health: database check failed", { error, ms: Date.now() - started });
  }

  const ok = database === "ok";
  return NextResponse.json(
    {
      status: ok ? "ok" : "down",
      checks: { database },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      ms: Date.now() - started,
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
