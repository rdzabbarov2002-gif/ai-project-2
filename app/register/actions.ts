"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { track } from "@/lib/analytics";

export interface AuthFormState {
  error: string | null;
  /** Sent back with an error so the form keeps it (see app/login/actions.ts). */
  email?: string;
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getSiteUrl()}/auth/callback` },
  });

  if (error) {
    return { error: error.message, email };
  }

  if (data.user) await track("signed_up", data.user.id);

  // With email confirmations ON (Supabase's default), signUp succeeds but
  // returns no session yet — the user must click the emailed link first,
  // which lands on /auth/callback. With confirmations OFF, a session comes
  // back immediately and we can send them straight in. Branching on
  // `data.session` (rather than assuming one behavior) means this doesn't
  // silently break if that project setting changes later.
  // With a session straight away, new accounts start at onboarding
  // (Stage 12) — which forwards to the Dashboard if the guest→user merge
  // already created a profile from their guest draft.
  if (data.session) {
    redirect("/onboarding");
  }
  redirect("/register/check-email");
}
