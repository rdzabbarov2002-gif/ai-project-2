import type { MetadataRoute } from "next";

/**
 * robots.txt and sitemap.xml (app/robots.ts, app/sitemap.ts), as pure
 * functions of the environment and the tool list so they can be tested.
 */

/** Pages for search engines: public, and the same for everyone. */
export const PUBLIC_PATHS = ["/", "/tools", "/templates", "/pricing", "/faq", "/changelog", "/privacy", "/terms"];

/** Per-person pages and endpoints — nothing for a search engine. */
export const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
  "/dashboard",
  "/onboarding",
  "/profile",
  "/history",
  "/settings",
  "/feedback",
  "/reset-password",
];

/**
 * Production is indexed; previews, staging and local runs are not, so a
 * preview URL never competes with the real site in search results.
 */
export function robotsFor(origin: string, env: Record<string, string | undefined>): MetadataRoute.Robots {
  if (env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${origin}/sitemap.xml`,
  };
}

export function sitemapFor(origin: string, toolSlugs: string[]): MetadataRoute.Sitemap {
  return [
    ...PUBLIC_PATHS.map((path) => ({
      url: `${origin}${path === "/" ? "" : path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...toolSlugs.map((slug) => ({
      url: `${origin}/tools/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
