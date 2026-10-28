"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/server";
import { authErrorMessage } from "@/lib/i18n/auth";

export interface NewPasswordState {
  error: string | null;
}

/**
 * Sets a new password for the signed-in user. Reached from the reset link
 * (app/auth/callback signs the person in first); middleware.ts sends
 * anyone without a session to /login instead.
 */
export async function updatePassword(
  _prevState: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const t = await getMessages();

  if (password.length < 8) {
    return { error: t.auth.passwordTooShort };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: authErrorMessage(error.message, t) };
  }

  redirect("/dashboard");
}
