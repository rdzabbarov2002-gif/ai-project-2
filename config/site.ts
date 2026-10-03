/**
 * What the public pages say about the product and whoever runs it (Phase
 * 8): the name and pitch for search results and link previews, the
 * support address, and the policies the Privacy Policy and Terms state.
 * Who runs the service comes from the environment: legalFacts().
 */
export const site = {
  name: "AI Marketing Workspace",
  title: "AI Marketing Workspace — marketing copy for your business, in seconds",
  description:
    "AI-powered marketing tools for small businesses — ads, emails and social posts generated from one company profile.",
  /** A first payment can be refunded within this many days (Terms, FAQ). */
  refundDays: 14,
  /** Notice before a price change reaches a subscriber (Terms). */
  priceChangeNoticeDays: 30,
  /** How long usage statistics, error reports and logs are kept at most (Privacy). */
  statisticsRetention: "12 months",
  /** When the Privacy Policy or Terms last changed — update with their text. */
  legalUpdated: "2026-09-27",
  /** How long support takes to answer, at most (FAQ, support). */
  supportResponseHours: 24,
};

/**
 * The public address of the site, for absolute links in the sitemap and
 * link previews: NEXT_PUBLIC_SITE_URL, else the production domain Vercel
 * reports, else local.
 */
export function siteOrigin(env: Record<string, string | undefined> = process.env) {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/**
 * Where people write to us: NEXT_PUBLIC_SUPPORT_EMAIL — required in
 * production (lib/env.ts); a placeholder elsewhere. Read by its full name
 * so the build can put it into the browser code too (the footer).
 */
export function supportEmail() {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";
}

/**
 * The link preview image, drawn by app/opengraph-image.tsx. Named in every
 * page's metadata: a page that sets its own `openGraph` doesn't inherit
 * the root's image.
 */
export const previewImage = { url: "/opengraph-image", width: 1200, height: 630, alt: site.title };

/**
 * A public page's title, description and canonical address, repeated in
 * its link preview on Open Graph (LinkedIn, Facebook…) and X.
 */
export function pageMetadata(title: string, description: string, path: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      siteName: site.name,
      title,
      description,
      url: path,
      images: [previewImage],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [previewImage] },
  };
}

/**
 * Who runs the service, for the Privacy Policy and Terms: LEGAL_OPERATOR
 * (the legal entity, with its address), LEGAL_COUNTRY (whose laws govern
 * the Terms) and EMAIL_PROVIDER (who sends account emails) — all three
 * required in production (lib/env.ts). Until they're set the pages show
 * placeholders and say "Draft".
 */
export function legalFacts() {
  const operator = process.env.LEGAL_OPERATOR;
  const country = process.env.LEGAL_COUNTRY;
  const emailProvider = process.env.EMAIL_PROVIDER;
  return {
    operator: operator || "[Company name and address]",
    country: country || "[country]",
    emailProvider: emailProvider || "[Email provider]",
    draft: !operator || !country || !emailProvider,
  };
}
