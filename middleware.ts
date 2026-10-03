import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { CSP_REPORT_PATH, buildCsp, createNonce, cspHeaderName, cspMode } from "@/lib/csp";
import { trackVisit } from "@/lib/visitor";

/**
 * Protects the `(auth)` route group (Dashboard, Onboarding, Company
 * Profile, History, Billing, Feedback) at the edge, before any Server Component renders — avoids a
 * flash of protected content and keeps the redirect-to-login decision in
 * one place rather than duplicated per page.
 *
 * The (auth) group's own layout (app/(auth)/layout.tsx) re-checks the user
 * server-side as defense in depth — middleware can be bypassed by direct
 * fetches to a Server Action/Route Handler in edge cases, the layout check
 * cannot.
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/onboarding",
  "/profile",
  "/history",
  "/settings",
  "/feedback",
  // Reached signed in, from the reset link (app/auth/callback).
  "/reset-password",
];

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // The Content Security Policy (lib/csp.ts). On the request too: Next.js
  // reads the nonce from there for its own scripts, the root layout from
  // `x-nonce`; updateSession passes these request headers on.
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV !== "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
  const cspHeader = cspHeaderName(cspMode());
  request.headers.set("x-nonce", nonce);
  request.headers.set(cspHeader, csp);

  const { response, user } = await updateSession(request);
  response.headers.set(cspHeader, csp);
  response.headers.set("Reporting-Endpoints", `csp="${CSP_REPORT_PATH}"`);

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // The funnel's first step: a page opened by someone not signed in.
  if (!user) trackVisit(request, (promise) => event.waitUntil(promise));

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, images and the PWA files —
     * those never need a session refresh and skipping them keeps
     * navigation fast.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.json|sw.js|offline.html|icons/).*)",
  ],
};
