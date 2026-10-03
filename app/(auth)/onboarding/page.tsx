import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/profile/OnboardingWizard";
import { getMessages } from "@/lib/i18n/server";

/** Autofill (a server action on this page) fetches a website and calls the
 *  AI gateway — well past Vercel's default 10–15s function limit. */
export const maxDuration = 60;

/**
 * First stop after sign-up (Stage 12, architecture doc §8: "Onboarding (if
 * the profile is still a draft) → Dashboard"). Anyone who already has a
 * company profile — including one the guest→user merge just created from
 * their guest draft (Stage 11) — goes straight on to the Dashboard; the
 * /profile page is where an existing profile gets edited.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("company_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count > 0) redirect("/dashboard");
  const t = await getMessages();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-ink-950">
          {t.onboarding.title}
        </h1>
        <p className="text-sm text-ink-600">{t.onboarding.lead}</p>
      </div>
      <OnboardingWizard />
      <p className="text-sm">
        <Link href="/dashboard" className="text-ink-600 hover:underline">
          {t.onboarding.skipForNow}
        </Link>
      </p>
    </main>
  );
}
