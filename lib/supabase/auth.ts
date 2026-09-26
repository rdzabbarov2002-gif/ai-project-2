import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Server-side auth helpers, for use in Server Components / Server Actions /
 * Route Handlers only (the "server-only" import makes an accidental client
 * import a build error rather than a runtime surprise).
 */

/**
 * Memoized per request (React `cache`): since Stage 14 the (guest)/(auth)
 * layouts need the user for navigation and most pages ask again for their
 * own logic — without this, each render made two identical round trips to
 * Supabase Auth.
 */
export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Use at the top of a protected Server Component/layout. Middleware already
 * redirects unauthenticated requests away from `(auth)` routes — this is
 * the defense-in-depth check for the rare paths middleware can't cover
 * (e.g. a Server Action invoked directly), so `(auth)/layout.tsx` never
 * renders protected content for a logged-out request even if middleware is
 * skipped or misconfigured.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
