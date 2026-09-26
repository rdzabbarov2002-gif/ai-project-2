import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Protects the `(auth)` route group (Dashboard, Onboarding, Company
 * Profile, History, Billing) at the edge, before any Server Component renders — avoids a
 * flash of protected content and keeps the redirect-to-login decision in
 * one place rather than duplicated per page.
 *
 * The (auth) group's own layout (app/(auth)/layout.tsx) re-checks the user
 * server-side as defense in depth — middleware can be bypassed by direct
 * fetches to a Server Action/Route Handler in edge cases, the layout check
 * cannot.
 */
const PROTECTED_PATHS = ["/dashboard", "/onboarding", "/profile", "/history", "/settings"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, images and the PWA files —
     * those never need a session refresh and skipping them keeps
     * navigation fast.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)",
  ],
};
