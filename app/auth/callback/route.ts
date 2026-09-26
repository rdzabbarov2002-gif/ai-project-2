import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase email-confirmation / magic-link landing point. Exchanges the
 * one-time `code` query param for a real session cookie, then sends the
 * user on to onboarding (Stage 12) — which forwards to the Dashboard when
 * a profile already exists.
 *
 * A missing, expired or already-used code used to be ignored, landing the
 * person on /dashboard → middleware → a bare /login with no explanation;
 * it now reaches /login with a reason the page can show.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
