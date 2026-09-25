import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * Reads/writes the auth cookie via Next's cookies() API.
 *
 * Uses `getAll`/`setAll` — the only cookie methods @supabase/ssr 0.12.x
 * accepts; the older `get`/`set`/`remove` shape this file used against
 * @supabase/ssr ^0.4.0 (Stage 2) is rejected by the client library at
 * runtime in current versions ("You MUST use ONLY getAll and setAll",
 * per Supabase's own current Next.js integration guide). Verified via
 * web search during Phase 1 (build) — not available when this file was
 * first written, since this project's own environment has never had
 * network access to check.
 *
 * `cookies()` itself stays un-awaited: Next.js 14.2.5 (this project's
 * pinned version) still returns the cookie store synchronously — the
 * `await cookies()` pattern shown in Supabase's current docs is for
 * Next.js 15+, where `cookies()` became async. This function's own
 * signature is unchanged (still synchronous, still returns
 * `SupabaseClient<Database>` directly, not a Promise) specifically so
 * none of its ~13 call sites across the project need to change.
 *
 * No RLS-bypassing service-role client is exposed from here on purpose —
 * that belongs in a separate, explicitly-named `admin.ts` once it's actually
 * needed (Stage 3+), so it's never reached for by accident.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, which can't
            // set cookies directly — safe to ignore here because
            // middleware.ts's updateSession() refreshes the session on
            // every request anyway (same reasoning Supabase's own
            // reference implementation documents for this exact catch).
          }
        },
      },
    },
  );
}
