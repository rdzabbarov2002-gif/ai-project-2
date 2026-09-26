"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export interface AuthFormState {
  error: string | null;
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // `next` comes from the query string via a hidden field — validated so
  // it can only ever point back into this app (see lib/safe-redirect.ts).
  const next = safeRedirectPath(formData.get("next"), "/dashboard");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Guest → user merge is triggered client-side (components/auth/AuthSyncListener.tsx)
  // via Supabase's onAuthStateChange, not here — a server action has no
  // access to the guest token sitting in the browser's localStorage.
  redirect(next);
}
