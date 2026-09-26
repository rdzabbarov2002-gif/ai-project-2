import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Supabase email-confirmation / password-reset landing point. Exchanges
 * the one-time `code` query param for a real session cookie, then sends
 * the user on to `next` — /reset-password for a reset link
 * (app/forgot-password/actions.ts) — or, by default, to onboarding
 * (Stage 12), which forwards to the Dashboard when a profile already
 * exists. `next` can only point back into this app (lib/safe-redirect.ts).
 *
 * A missing, expired or already-used code used to be ignored, landing the
 * person on /dashboard → middleware → a bare /login with no explanation;
 * it now reaches a page with a reason it can show: /forgot-password for a
 * reset link (where a new one can be requested), /login otherwise.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // The same origin the emailed link was built with (lib/site-url.ts), not
  // request.url's: under `next start` that is always the server's own
  // hostname (localhost), so the session cookie set here would belong to a
  // different host than the page the person is sent to.
  const origin = getSiteUrl();
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/onboarding");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
