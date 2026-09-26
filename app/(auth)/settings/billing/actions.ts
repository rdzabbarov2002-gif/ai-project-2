"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { track } from "@/lib/analytics";

export interface DeleteAccountState {
  error: string | null;
}

/**
 * Deletes the signed-in user's account and everything it owns (GDPR
 * right to erasure). Removing the Auth user cascades through the foreign
 * keys: public.users (0003), then company_profiles, usage_counters,
 * subscriptions and generations (0004, 0007, 0008) — covered by
 * supabase/tests/account-deletion.test.sql. Needs the service role:
 * users can't delete Auth accounts themselves.
 */
export async function deleteAccount(): Promise<DeleteAccountState> {
  const user = await requireUser();

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    logger.error("account: delete failed", { error });
    return { error: "We couldn't delete your account. Please try again." };
  }

  await track("account_deleted", user.id);

  // Clears the session cookies; the session itself died with the account.
  await createClient().auth.signOut();
  redirect("/");
}
