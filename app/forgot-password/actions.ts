"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export interface ResetRequestState {
  error: string | null;
  sent: boolean;
}

/**
 * Emails a password-reset link. The link lands on /auth/callback, which
 * signs the person in and forwards them to /reset-password. Supabase
 * answers the same way whether or not an account exists for the address,
 * so this page can't be used to find out who has an account.
 */
export async function requestPasswordReset(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email.", sent: false };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  return { error: null, sent: true };
}
