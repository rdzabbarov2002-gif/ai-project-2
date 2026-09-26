import { NextResponse } from "next/server";
import { z } from "zod";
import { appSettings } from "@/config/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GuestCompanyProfileDraft } from "@/lib/guest-session/types";

/**
 * Persists a guest's short company-profile draft to `guest_sessions`.
 *
 * Closes a gap found in Phase 1: Stage 2 stored the draft in localStorage
 * only, while everything that *reads* it lives server-side and reads the
 * `guest_sessions.company_profile_draft` column — the generation pipeline
 * (lib/generation/identity.ts → company context for guest prompts) and the
 * guest→user merge (app/api/session/merge/route.ts → first company
 * profile on sign-up). Nothing ever wrote that column, so both paths were
 * dead in practice. This route is that missing write, nothing more.
 *
 * Admin client for the same reason as identity.ts and the merge route:
 * `guest_sessions` has RLS enabled with no policies at all (migration
 * 0005) — the service role is the only way in. The session token is the
 * guest's bearer credential, exactly as it already is for /api/generate;
 * a caller can only ever write the draft of the session whose token it
 * holds.
 */

// Same fields and the same length limits as the signed-in profile form's
// schema (app/(auth)/profile/actions.ts) — kept in step by hand because a
// "use server" module can't export a schema object — except that nothing
// is required: a draft is by definition partial. The token bounds mirror
// /api/generate's (lib/generation/validate.ts).
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const DraftRequestSchema = z.object({
  guestSessionToken: z.string().trim().min(10).max(200),
  draft: z.object({
    name: optionalText(200),
    niche: optionalText(200),
    toneOfVoice: optionalText(200),
    targetAudience: optionalText(500),
    usp: optionalText(500),
    websiteUrl: optionalText(300),
  }),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = DraftRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Drop the empty fields zod turned into `undefined`, so the stored JSON
  // only ever holds what the guest actually filled in.
  const draft: GuestCompanyProfileDraft = Object.fromEntries(
    Object.entries(parsed.data.draft).filter(([, value]) => value !== undefined),
  );

  const expiresAt = new Date(
    Date.now() + appSettings.guestSessionTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Upsert on the unique `session_token`: creates the row if this guest
  // hasn't generated anything yet (identity.ts creates it lazily too), and
  // otherwise updates the draft and slides the TTL, same as a generation
  // does.
  const { error } = await createAdminClient()
    .from("guest_sessions")
    .upsert(
      {
        session_token: parsed.data.guestSessionToken,
        company_profile_draft: Object.keys(draft).length > 0 ? { ...draft } : null,
        expires_at: expiresAt,
      },
      { onConflict: "session_token" },
    );

  if (error) {
    console.error("[session/draft] failed to save draft:", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "saved" });
}
