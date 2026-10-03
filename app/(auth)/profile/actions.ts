"use server";

import { z } from "zod";
import { getMessages } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchWebsiteSummary, WebsiteFetchError } from "@/lib/profile-autofill/fetchWebsite";
import { extractProfile, type SuggestedProfile } from "@/lib/profile-autofill/extractProfile";
import { logger } from "@/lib/logger";

/**
 * The only validation layer for this form — no parallel check in the
 * client component, no second schema anywhere else. The client component
 * relies on native HTML constraints (`required`, `maxLength`) purely for
 * immediate typing feedback; the authoritative check, the one that can't
 * be bypassed, is this one, same principle as every other write path in
 * the project (Stage 5's /api/generate, Stage 6's ToolRunner client-side
 * required-field check being explicitly non-authoritative).
 *
 * Field set and constraints mirror `GuestCompanyProfileDraft`
 * (lib/guest-session/types.ts) — the same six fields Stage 11's merge
 * already writes into this same table. Not reused directly as a type
 * here because that interface has no length limits (it was never meant
 * to gate a write, only to shape a draft) — this schema is the first
 * place those fields get real, enforced constraints, which is new to
 * Stage 12 by necessity (nothing before this wrote to company_profiles
 * from untrusted form input).
 */
const CompanyProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Company name is required.").max(200),
  niche: z.string().trim().max(200).optional(),
  toneOfVoice: z.string().trim().max(200).optional(),
  targetAudience: z.string().trim().max(500).optional(),
  usp: z.string().trim().max(500).optional(),
  websiteUrl: z.string().trim().max(300).optional(),
});

export interface CompanyProfileFormState {
  error: string | null;
  success: boolean;
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const str = typeof value === "string" ? value.trim() : "";
  return str === "" ? undefined : str;
}

/**
 * Create-or-update in one action, branching on whether the form carried
 * an existing profile's `id` (set by the page from its own read — see
 * page.tsx) — not on a separate "does a profile exist" lookup here, which
 * would just be re-deriving what the page already determined moments
 * earlier. Targets the update by `id`, not by `user_id`: `company_profiles`
 * deliberately allows more than one row per user (Stage 3, for future
 * agency use) — updating by `user_id` alone would silently overwrite
 * every profile the user has, not just the one this form is editing.
 * RLS (`auth.uid() = user_id` on both the update's USING and the
 * insert's WITH CHECK, migration 0004) is the backstop even if `id` were
 * tampered with client-side — it scopes both paths to rows this user
 * actually owns regardless.
 */
export async function saveCompanyProfile(
  _prevState: CompanyProfileFormState,
  formData: FormData,
): Promise<CompanyProfileFormState> {
  const user = await requireUser();
  const t = await getMessages();

  const parsed = CompanyProfileSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    name: emptyToUndefined(formData.get("name")) ?? "",
    niche: emptyToUndefined(formData.get("niche")),
    toneOfVoice: emptyToUndefined(formData.get("toneOfVoice")),
    targetAudience: emptyToUndefined(formData.get("targetAudience")),
    usp: emptyToUndefined(formData.get("usp")),
    websiteUrl: emptyToUndefined(formData.get("websiteUrl")),
  });

  if (!parsed.success) {
    // The one rule a person can break here is the missing name; the rest
    // (lengths) the form's own limits already prevent.
    const nameMissing = parsed.error.issues.some((issue) => issue.path[0] === "name");
    return { error: nameMissing ? t.profile.nameRequired : t.common.invalidInput, success: false };
  }

  const supabase = await createClient();
  const { id, ...fields } = parsed.data;

  const row = {
    user_id: user.id,
    name: fields.name,
    niche: fields.niche ?? null,
    tone_of_voice: fields.toneOfVoice ?? null,
    target_audience: fields.targetAudience ?? null,
    usp: fields.usp ?? null,
    website_url: fields.websiteUrl ?? null,
  };

  const { error } = id
    ? await supabase.from("company_profiles").update(row).eq("id", id)
    : await supabase.from("company_profiles").insert(row);

  if (error) {
    logger.error("profile: save failed", { error });
    return { error: t.profile.saveFailed, success: false };
  }

  // First mutation of Server Component-displayed data via a Server Action
  // that doesn't also redirect() (login/register, Stage 2, redirect —
  // which forces a fresh render on its own; this form stays on the page).
  // Without this, a reload right after saving could show stale data, and
  // — more importantly for correctness — the next save wouldn't yet see
  // an `id` from a fresh read if the user never navigates away.
  revalidatePath("/profile");

  return { error: null, success: true };
}

export interface AutofillResult {
  error: string | null;
  profile: SuggestedProfile | null;
  /** "metadata" = the AI step failed and only the page's own title and
   *  description could be used — the form says so. */
  source?: "ai" | "metadata";
}

/**
 * Stage 12 — "autofill by URL" (architecture doc §9). Returns suggested
 * values only; nothing is written here. The form (onboarding wizard or
 * /profile) shows them for review and saves through saveCompanyProfile
 * above, so that action stays the one validated write path.
 *
 * Signed-in only (requireUser): it makes an outbound request and an AI
 * call on the server's behalf. The URL is untrusted input — see
 * lib/profile-autofill/fetchWebsite.ts for the SSRF handling.
 */
export async function autofillCompanyProfile(url: string): Promise<AutofillResult> {
  await requireUser();
  const t = await getMessages();

  if (typeof url !== "string" || url.trim().length === 0 || url.length > 300) {
    return { error: t.profile.enterWebsite, profile: null };
  }

  try {
    const site = await fetchWebsiteSummary(url);
    const { profile, source } = await extractProfile(site);
    return { error: null, profile, source };
  } catch (error) {
    if (error instanceof WebsiteFetchError) {
      return { error: t.profile.websiteErrors[error.message] ?? error.message, profile: null };
    }
    logger.error("profile: autofill failed", { error });
    return { error: t.profile.readFailed, profile: null };
  }
}
