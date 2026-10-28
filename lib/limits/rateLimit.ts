import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";

export interface RateLimit {
  /** Requests let through in any window, at most. */
  max: number;
  windowSeconds: number;
}

/**
 * Rate limits (architecture doc §17: "protection against abuse and
 * AI-budget overrun"). Separate from the monthly allowance (checkUsage):
 * that one caps how much, these cap how fast — and they're checked before
 * any AI call is paid for.
 *
 * Every request a limit lets through is recorded in `rate_limit_events`
 * (migration 0027) under its subject — what it's limited by, e.g.
 * `generate:user:<id>` — when it starts, not when it finishes, so
 * requests sent at once can't all pass; and the record is in the
 * database, so the limit holds across serverless instances (an in-memory
 * counter wouldn't). Admin client: the table and its function are server
 * only.
 *
 * Fails open on a database error: these are secondary guards, the monthly
 * allowance still applies, and refusing every request because one query
 * hiccuped would be the worse failure.
 */
export async function isOverRateLimit(
  admin: SupabaseClient<Database>,
  subject: string,
  limit: RateLimit,
): Promise<boolean> {
  const { data, error } = await admin.rpc("take_rate_limit", {
    p_subject: subject,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    logger.error("rate-limit: check failed, not limiting", { error });
    return false;
  }
  return data === false;
}

/**
 * The subject that limits requests from one IP address — for requests
 * without an account, where it is the only thing to go by. A keyed hash
 * of the address and the day, never the address itself: it can't be
 * turned back into the address, and the same address gets a new one
 * every day (like the visitor ID, lib/visitor.ts).
 */
export function ipSubject(scope: string, ip: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const code = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    .update(`${day}|${network(ip)}`)
    .digest("hex")
    .slice(0, 32);
  return `${scope}:ip:${code}`;
}

/**
 * What one subscriber holds: an IPv4 address, or an IPv6 /64 — a home or
 * a phone gets a whole /64 and can use any address in it, so limiting a
 * single IPv6 address would limit nothing.
 */
function network(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1]!;
  if (!ip.includes(":")) return ip;
  const [head = "", tail] = ip.toLowerCase().split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const zeros =
    tail === undefined
      ? []
      : Array(Math.max(8 - headParts.length - tailParts.length, 0)).fill("0");
  const hextets = [...headParts, ...zeros, ...tailParts].slice(0, 4);
  return `${hextets.map((part) => part.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
