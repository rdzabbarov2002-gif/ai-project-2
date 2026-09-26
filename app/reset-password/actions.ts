"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
