"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getMessages } from "@/lib/i18n/server";
import { authErrorMessage } from "@/lib/i18n/auth";

export interface ResetRequestState {
  error: string | null;
  sent: boolean;
  /** Sent back with an error so the form keeps it (see app/login/actions.ts). */
  email?: string;
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
  const t = await getMessages();

  if (!email) {
    return { error: t.auth.enterEmail, sent: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: authErrorMessage(error.message, t), sent: false, email };
  }

  return { error: null, sent: true };
}
