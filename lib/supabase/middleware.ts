import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase auth cookie on every request that passes through
 * the root middleware, and returns both the (possibly redirected) response
 * and the resolved user — so middleware.ts can make a routing decision
 * without a second round-trip.
 *
 * Follows the official @supabase/ssr Next.js middleware pattern: cookies
 * must be read/written on both the request and the response objects.
 * Uses `getAll`/`setAll`, not the older `get`/`set`/`remove` this file
 * used against @supabase/ssr ^0.4.0 (Stage 2) — same migration and same
 * reasoning as lib/supabase/server.ts (see its comment for the full
 * explanation; verified via web search during Phase 1's build check).
 * `updateSession`'s own signature and `{response, user}` return shape
 * are unchanged, so root middleware.ts needs no changes either.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must call getUser() (not getSession()) here — it revalidates the token
  // against Supabase rather than trusting the cookie as-is, which is what
  // makes this safe to use for routing decisions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
