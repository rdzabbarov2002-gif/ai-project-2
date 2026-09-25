"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export interface AuthFormState {
  error: string | null;
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmations ON (Supabase's default), signUp succeeds but
  // returns no session yet — the user must click the emailed link first,
  // which lands on /auth/callback. With confirmations OFF, a session comes
  // back immediately and we can send them straight in. Branching on
  // `data.session` (rather than assuming one behavior) means this doesn't
  // silently break if that project setting changes later.
  if (data.session) {
    redirect("/dashboard");
  }
  redirect("/register/check-email");
}
