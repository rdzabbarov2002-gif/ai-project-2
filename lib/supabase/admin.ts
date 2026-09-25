import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client — bypasses RLS entirely. Deliberately not
 * created back in Stage 1/2/3: those stages had no code that actually
 * needed it, and an unused privileged client sitting in the tree is a risk
 * with no offsetting benefit. Stage 5 is the first real caller:
 *
 * - `guest_sessions` (migration 0005) has RLS enabled with NO client
 *   policies at all — the only way to read/write it is this client.
 * - `usage_counters` (migration 0007) has no client write policy — same.
 * - `generations` rows owned by a guest (`guest_session_id` set, `user_id`
 *   null) are equally unreachable under RLS for an unauthenticated caller.
 *
 * Rules for using this file:
 * 1. Only ever import it from server-only code that already knows it's
 *    handling a privileged operation (see lib/generation/*, never a
 *    Server Component that's just reading data a normal user-scoped
 *    client could read).
 * 2. Never construct it with anything other than
 *    `SUPABASE_SERVICE_ROLE_KEY` — that variable has no `NEXT_PUBLIC_`
 *    prefix specifically so Next.js never inlines it into a client bundle.
 * 3. Prefer the request-scoped client (lib/supabase/server.ts) whenever
 *    RLS alone is sufficient — every extra caller of this file is a place
 *    a future bug could bypass row-level security by accident.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
