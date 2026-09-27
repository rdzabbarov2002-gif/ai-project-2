/**
 * What the public pages say about the product and whoever runs it (Phase
 * 8): the name and pitch for search results and link previews, the
 * support address, and the facts the Privacy Policy and Terms rely on.
 *
 * `operator` and `country` are the owner's to fill in before launch
 * (docs/launch.md, "Before launch"); the pages show them as written.
 */
export const site = {
  name: "AI Marketing Workspace",
  title: "AI Marketing Workspace — marketing copy for your business, in seconds",
  description:
    "AI-powered marketing tools for small businesses — ads, emails and social posts generated from one company profile.",
  /** The legal entity that runs the service. */
  operator: "[Company name]",
  /** Whose laws govern the Terms. */
  country: "[country]",
  /** A first payment can be refunded within this many days (Terms). */
  refundDays: 14,
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
