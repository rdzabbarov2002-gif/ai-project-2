import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GuestCompanyProfileDraft } from "@/lib/guest-session/types";
import type { Identity } from "./identity";

/**
 * Provider-agnostic shape every tool's prompt gets built from — same shape
 * whether it came from a real `company_profiles` row or a guest's
 * localStorage-backed draft, so `lib/generation/prompt.ts` doesn't need to
 * know which one it's looking at.
 */
export type CompanyContext = GuestCompanyProfileDraft;

export interface CompanyContextResult {
  companyProfileId: string | null;
  context: CompanyContext | null;
}

/**
 * No profile is a valid, expected state — not an error. A user might
 * generate before ever completing onboarding (guest-first means "use a
 * tool" comes before "profile exists" by design, project architecture doc
 * §8), and a guest may not have filled in a draft yet either. The prompt
 * builder (Stage 5, lib/generation/prompt.ts) degrades gracefully to a
 * generic prompt when `context` is null — this function's only job is to
 * fetch what exists, not to require it.
 */
export async function resolveCompanyContext(params: {
  userClient: SupabaseClient<Database>;
  identity: Identity;
  requestedCompanyProfileId?: string;
}): Promise<CompanyContextResult> {
  if (params.identity.type === "guest") {
    return { companyProfileId: null, context: params.identity.companyProfileDraft };
  }

  let query = params.userClient
    .from("company_profiles")
    .select("id, name, niche, tone_of_voice, target_audience, usp, website_url")
    .eq("user_id", params.identity.userId);

  // RLS (migration 0004) already scopes every row to auth.uid() = user_id
  // regardless of which id is requested — a caller passing another user's
  // companyProfileId simply gets no row back, not another user's data.
  query = params.requestedCompanyProfileId
    ? query.eq("id", params.requestedCompanyProfileId)
    : query.order("updated_at", { ascending: false });

  const { data } = await query.limit(1).maybeSingle();

  if (!data) return { companyProfileId: null, context: null };

  return {
    companyProfileId: data.id,
    context: {
      name: data.name ?? undefined,
      niche: data.niche ?? undefined,
      toneOfVoice: data.tone_of_voice ?? undefined,
      targetAudience: data.target_audience ?? undefined,
      usp: data.usp ?? undefined,
      websiteUrl: data.website_url ?? undefined,
    },
  };
}
