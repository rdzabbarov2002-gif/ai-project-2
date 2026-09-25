import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { appSettings } from "@/config/settings";
import type { GuestCompanyProfileDraft } from "@/lib/guest-session/types";

export type Identity =
  | { type: "user"; userId: string }
  | { type: "guest"; guestSessionId: string; companyProfileDraft: GuestCompanyProfileDraft | null };

/**
 * The one place that decides "who is making this request" for the whole
 * generation pipeline. Every other module (plan limits, usage, company
 * context, saving the row) takes an already-resolved `Identity`, never a
 * raw user/cookie/token — this is the only function that touches auth
 * state or the guest_sessions table directly.
 *
 * Signed-in wins over a guest token if both are somehow present (e.g. a
 * stale guest token still in localStorage after Stage 2's merge trigger
 * fires) — there's no scenario where a logged-in request should be
 * evaluated as a guest.
 */
export async function resolveIdentity(params: {
  userClient: SupabaseClient<Database>;
  adminClient: SupabaseClient<Database>;
  guestSessionToken?: string;
}): Promise<Identity | null> {
  const {
    data: { user },
  } = await params.userClient.auth.getUser();

  if (user) {
    return { type: "user", userId: user.id };
  }

  if (!params.guestSessionToken) {
    return null;
  }

  return upsertGuestSession(params.adminClient, params.guestSessionToken);
}

/**
 * Stage 2 created the client-side contract for a guest session token
 * (localStorage) but nothing ever wrote the corresponding row to
 * `guest_sessions` — it had no reason to yet. This is the first code path
 * that actually needs the row to exist (to check per-guest usage against
 * it, and to attach generations to a real `guest_session_id` foreign key),
 * so it's created here, lazily, on first use — not a gap being patched
 * after the fact, but the point in the architecture where this was always
 * meant to happen (see project architecture doc §8: guest state is
 * created as the guest starts interacting, not on some earlier trigger).
 *
 * Sliding TTL: every real use extends `expires_at`, so an active guest is
 * never cut off mid-session just because their first visit was 30 days
 * ago — only genuinely abandoned sessions expire.
 */
async function upsertGuestSession(
  adminClient: SupabaseClient<Database>,
  sessionToken: string,
): Promise<Identity> {
  const newExpiresAt = new Date(
    Date.now() + appSettings.guestSessionTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: existing } = await adminClient
    .from("guest_sessions")
    .select("id, company_profile_draft")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (existing) {
    await adminClient
      .from("guest_sessions")
      .update({ expires_at: newExpiresAt })
      .eq("id", existing.id);

    return {
      type: "guest",
      guestSessionId: existing.id,
      companyProfileDraft:
        (existing.company_profile_draft as GuestCompanyProfileDraft | null) ?? null,
    };
  }

  const { data: created, error } = await adminClient
    .from("guest_sessions")
    .insert({ session_token: sessionToken, expires_at: newExpiresAt })
    .select("id")
    .single();

  if (error || !created) {
    // Falls through to the route's generic 500 handling — deliberately not
    // swallowed into a silent "treat as no identity" here, since that
    // would look to the caller like an invalid token rather than a real
    // server-side failure.
    throw new Error(`Failed to create guest session: ${error?.message ?? "unknown error"}`);
  }

  return { type: "guest", guestSessionId: created.id, companyProfileDraft: null };
}
