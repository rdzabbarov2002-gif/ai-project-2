import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GuestCompanyProfileDraft } from "@/lib/guest-session/types";
import { logger } from "@/lib/logger";
import { track } from "@/lib/analytics";

/**
 * Guest → User merge endpoint. Stage 2 built the auth check, request
 * validation, and the response contract the client (AuthSyncListener)
 * already codes against (`status === "merged"` clears the guest token —
 * nothing about that contract changes here, see below). Stage 11 fills
 * in the one thing Stage 2 explicitly deferred: the actual data move.
 *
 * Per migration 0008's own comment (written in Stage 3, describing this
 * exact stage before it existed): "flipping guest_session_id to null and
 * setting user_id on existing rows is enough, nothing needs to move" —
 * this is a metadata UPDATE, not a data copy. That design decision is
 * being executed here, not invented here.
 */

interface MergeRequestBody {
  guestSessionToken?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: MergeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.guestSessionToken || typeof body.guestSessionToken !== "string") {
    return NextResponse.json(
      { error: "missing_guest_session_token" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // guest_sessions has no client-facing read policy at all (migration
  // 0005) — the admin client is the only way to resolve a token to a row,
  // same reasoning as lib/generation/identity.ts's lazy creation of this
  // same table.
  const { data: guestSession } = await admin
    .from("guest_sessions")
    .select("id, company_profile_draft")
    .eq("session_token", body.guestSessionToken)
    .maybeSingle();

  // No row for this token (never used to generate anything, or already
  // merged by an earlier request — this endpoint is idempotent, see
  // below) — nothing to move, but the token itself is now meaningless
  // either way. Reporting "merged" here isn't inaccurate framing: the
  // client's only contract with this status is "stop holding onto this
  // token" (AuthSyncListener.tsx), which is exactly correct in this case
  // too. Introducing a distinct status for this case would mean teaching
  // the client a new state for no behavioral difference — the opposite
  // of the minimal, reuse-first change this stage calls for.
  if (!guestSession) {
    return NextResponse.json({ status: "merged", generationsMerged: 0, companyProfileCreated: false });
  }

  // The reassignment itself: one UPDATE, admin client. The authenticated
  // user's own RLS-scoped client cannot do this — `generations`' update
  // policy (migration 0008) is `auth.uid() = user_id`, and these rows
  // currently have `user_id = null`, which never satisfies that check.
  // Bypassing RLS here is exactly what lib/supabase/admin.ts exists for.
  const { data: reassigned, error: reassignError } = await admin
    .from("generations")
    .update({ user_id: user.id, guest_session_id: null })
    .eq("guest_session_id", guestSession.id)
    .select("id");

  if (reassignError) {
    // A real failure here — unlike a save failure in the generation
    // pipeline (Stage 5), there's no already-delivered result to protect
    // by degrading gracefully. Reporting an error lets the client leave
    // the guest token in place (AuthSyncListener's existing behavior for
    // any non-"merged" response) so a retry on the next sign-in can pick
    // this back up rather than silently losing the data.
    logger.error("session/merge: reassigning generations failed", { error: reassignError });
    return NextResponse.json({ error: "merge_failed" }, { status: 500 });
  }

  const companyProfileCreated = await maybeCreateCompanyProfileFromDraft(
    supabase,
    user.id,
    guestSession.company_profile_draft as GuestCompanyProfileDraft | null,
  );

  // Links the guest's analytics events to the account: guest → sign-up
  // conversion is the funnel's key step (lib/analytics.ts).
  await track("$create_alias", user.id, { alias: guestSession.id });

  return NextResponse.json({
    status: "merged",
    generationsMerged: reassigned?.length ?? 0,
    companyProfileCreated,
  });
}

/**
 * Only creates a profile when there's a `name` to create it with —
 * `company_profiles.name` is `not null` (migration 0004), so a draft with
 * no name can't become a valid row regardless of what else it has. Only
 * runs when the user has zero existing profiles: a returning user who
 * already set one up (e.g. from a previous session on another device)
 * should not get a second, draft-derived one silently appended —
 * `company_profiles` allows multiple rows per user by design (Stage 3,
 * for future agency use), but that's a deliberate choice a user makes,
 * not something this endpoint should do on their behalf.
 *
 * Uses the caller's own RLS-scoped client, not admin: this INSERT is for
 * a row owned by `user.id`, and `company_profiles`' authenticated INSERT
 * policy (`auth.uid() = user_id`) already permits it — no privileged
 * access needed, same reasoning Stage 5's saveGeneration() used to pick
 * between the two clients for authenticated writes.
 */
async function maybeCreateCompanyProfileFromDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  draft: GuestCompanyProfileDraft | null,
): Promise<boolean> {
  if (!draft?.name) return false;

  const { count } = await supabase
    .from("company_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return false;

  const { error } = await supabase.from("company_profiles").insert({
    user_id: userId,
    name: draft.name,
    niche: draft.niche,
    tone_of_voice: draft.toneOfVoice,
    target_audience: draft.targetAudience,
    usp: draft.usp,
    website_url: draft.websiteUrl,
  });

  if (error) {
    // Not fatal to the merge response: generations (the primary asset)
    // already moved successfully by this point. Same "don't discard a
    // real result over a secondary write failing" reasoning as Stage 5's
    // saveGeneration().
    logger.error("session/merge: creating company profile from draft failed", { error });
    return false;
  }

  return true;
}
