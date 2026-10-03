import "server-only";
import { z } from "zod";
import { getDefaultProvider } from "@/lib/ai-provider";
import { appSettings } from "@/config/settings";
import type { WebsiteSummary } from "./fetchWebsite";
import { logger } from "@/lib/logger";

/**
 * Turns a fetched website (fetchWebsite.ts) into suggested company-profile
 * fields — suggestions only: the person reviews and edits them in the form
 * before anything is saved through the existing saveCompanyProfile action.
 *
 * Goes through the AI Provider Gateway like every other AI call in the
 * project (never a vendor SDK directly), via `getDefaultProvider()` —
 * the gateway's "configured default provider" entry point, which had no
 * caller until now. If the AI call fails for any reason (no key
 * configured, provider down, unparseable answer), the page's own metadata
 * still yields a name and a one-line description, so autofill degrades
 * instead of failing outright.
 */

export interface SuggestedProfile {
  name?: string;
  niche?: string;
  targetAudience?: string;
  toneOfVoice?: string;
  usp?: string;
  websiteUrl: string;
}

// Same length limits as the profile form (app/(auth)/profile/actions.ts);
// over-long AI answers are trimmed rather than rejected.
const field = (max: number) =>
  z
    .unknown()
    .transform((v) => (typeof v === "string" ? v.trim().slice(0, max) : ""))
    .transform((v) => v || undefined);

const AiProfileSchema = z.object({
  name: field(200),
  niche: field(200),
  targetAudience: field(500),
  toneOfVoice: field(200),
  usp: field(500),
});

const SYSTEM_PROMPT = `You fill in a small business's company profile from its website, for an AI marketing tool.
Respond with only a JSON object — no prose, no code fences — with these string keys:
"name" (the company or brand name), "niche" (industry/niche, a few words), "targetAudience" (who they sell to, one sentence),
"toneOfVoice" (2-4 adjectives describing how the site speaks), "usp" (their main unique selling point, one sentence).
Use only what the website says or clearly implies; use an empty string for anything you can't tell.`;

export async function extractProfile(site: WebsiteSummary): Promise<{
  profile: SuggestedProfile;
  source: "ai" | "metadata";
}> {
  const fromMetadata: SuggestedProfile = {
    name: guessNameFromMetadata(site),
    usp: site.description ?? undefined,
    websiteUrl: site.url,
  };

  try {
    const result = await getDefaultProvider().generate({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: [
        `Website: ${site.url}`,
        `Page title: ${site.title ?? ""}`,
        `Site name: ${site.siteName ?? ""}`,
        `Meta description: ${site.description ?? ""}`,
        "",
        "Page text (truncated):",
        site.text,
      ].join("\n"),
      model: appSettings.defaultAIModel,
      maxTokens: 2048,
      timeoutMs: 30_000,
    });

    const parsed = AiProfileSchema.safeParse(parseJsonObject(result.text));
    if (!parsed.success) throw new Error("Autofill answer was not a JSON object.");

    return {
      profile: {
        ...fromMetadata,
        ...Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)),
        websiteUrl: site.url,
      },
      source: "ai",
    };
  } catch (error) {
    logger.error("profile-autofill: AI extraction failed, using page metadata", { error });
    return { profile: fromMetadata, source: "metadata" };
  }
}

/** First `{` … last `}` — tolerant of a stray sentence or code fence. */
function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** "Acme Bakery | Fresh bread daily" → "Acme Bakery". Exported for tests. */
export function guessNameFromMetadata(site: Pick<WebsiteSummary, "siteName" | "title">): string | undefined {
  if (site.siteName) return site.siteName.slice(0, 200);
  const first = site.title?.split(/\s[|–—·:-]\s/)[0]?.trim();
  return first ? first.slice(0, 200) : undefined;
}
