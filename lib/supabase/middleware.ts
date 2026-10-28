import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase auth cookie on every request that passes through
 * the root middleware, and returns both the response and whether the
 * request is signed in — so middleware.ts can make a routing decision
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

  // getClaims(), not getSession(): it checks the token's signature rather
  // than trusting the cookie as-is, which is what makes this safe to use
  // for routing decisions. With the project's asymmetric signing keys that
  // check is local (the public keys are fetched once and cached), so this
  // middleware — which runs on every request — no longer waits on Supabase
  // Auth each time; with a legacy shared secret it asks Auth, as getUser()
  // did. A session revoked elsewhere passes here until its token expires
  // (an hour at most), which is fine for a redirect: every protected page,
  // action and route asks Auth itself (lib/supabase/auth.ts, getUser).
  const { data } = await supabase.auth.getClaims();

  return { response, signedIn: Boolean(data?.claims) };
}
