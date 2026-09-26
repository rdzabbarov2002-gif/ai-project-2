import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

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
 * it now reaches /login with a reason the page can show.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/onboarding");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
