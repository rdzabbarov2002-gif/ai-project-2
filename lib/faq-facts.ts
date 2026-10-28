import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FaqFacts } from "@/content/faq";
import { listPlanOptions } from "@/lib/billing/plans";
import { TRIAL_DAYS } from "@/lib/billing/stripe";
import { appSettings } from "@/config/settings";
import { site, supportEmail } from "@/config/site";

/** The numbers the FAQ quotes, from where the app itself reads them. */
export async function faqFacts(supabase: SupabaseClient<Database>): Promise<FaqFacts> {
  const plans = await listPlanOptions(supabase);
  const free = plans.find((plan) => plan.slug === "free");
  const pro = plans.find((plan) => plan.slug === "pro");
  return {
    guestLimit: appSettings.guestGenerationLimit,
    freeGenerations: free?.generationsPerMonth,
    proGenerations: pro?.generationsPerMonth,
    proPrice: pro?.priceMonth,
    trialDays: TRIAL_DAYS,
    refundDays: site.refundDays,
    perMinute: appSettings.maxGenerationsPerMinute,
    supportEmail: supportEmail(),
    supportResponseHours: site.supportResponseHours,
  };
}
