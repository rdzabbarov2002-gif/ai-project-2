import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CompanyProfileForm } from "@/components/profile/CompanyProfileForm";
import { getMessages } from "@/lib/i18n/server";

/** The form's "Autofill from website" server action fetches a website and
 *  calls the AI gateway — longer than Vercel's default function limit. */
export const maxDuration = 60;

/**
 * Own direct read via the existing Supabase server client — deliberately
 * not `lib/generation/company-context.ts`'s `resolveCompanyContext()`,
 * even though that function already queries this exact table for the
 * "authenticated user" case. Considered and rejected: that function is
 * built for the generation pipeline — it takes an `Identity` (guest-or-
 * user branching this page will never need, since only authenticated
 * requests ever reach here at all, enforced by the layout above it) and
 * returns a prompt-shaped `CompanyContext` (no `id`, no field-length
 * awareness) rather than a form-shaped one. This page also needs its own
 * write path regardless (resolveCompanyContext is read-only), so keeping
 * the read consistent with that new write — both direct queries against
 * `company_profiles` through the same existing client — avoided mixing
 * "read via a pipeline helper" with "write via page-local code" for what
 * is, from this page's perspective, one coherent concern. Nothing about
 * resolveCompanyContext or the pipeline it serves was touched.
 *
 * "Most recently updated" (not "first created") if more than one profile
 * exists — same tie-breaker resolveCompanyContext itself uses, kept
 * consistent for the same reason: a user with several profiles (Stage 3,
 * future agency use) sees and edits whichever one the pipeline itself
 * would currently pick as their default company context.
 *
 * No loading.tsx here, on purpose: with a loading boundary around the
 * page, Next.js 15 sometimes never renders the page a Server Action sends
 * back after revalidatePath (vercel/next.js#87529) — the Save button stayed
 * on "Saving…" in about one try in four. Don't add one back until that is fixed.
 */
export default async function CompanyProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const t = await getMessages();

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, name, niche, tone_of_voice, target_audience, usp, website_url")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">{t.profile.title}</h1>
      <CompanyProfileForm
        initialProfile={
          profile
            ? {
                id: profile.id,
                name: profile.name,
                niche: profile.niche ?? "",
                toneOfVoice: profile.tone_of_voice ?? "",
                targetAudience: profile.target_audience ?? "",
                usp: profile.usp ?? "",
                websiteUrl: profile.website_url ?? "",
              }
            : null
        }
      />
    </main>
  );
}
