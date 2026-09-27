import { describe, expect, it, vi } from "vitest";
import { PRIVATE_PATHS, robotsFor, sitemapFor } from "@/lib/seo";
import { legalFacts, pageMetadata, siteOrigin, supportEmail } from "@/config/site";

describe("robots.txt", () => {
  it("lets search engines into production's public pages, not the per-person ones", () => {
    const robots = robotsFor("https://app.example", { VERCEL_ENV: "production" });
    expect(robots.rules).toEqual({ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS });
    expect(PRIVATE_PATHS).toEqual(expect.arrayContaining(["/api/", "/dashboard", "/settings", "/history"]));
    expect(robots.sitemap).toBe("https://app.example/sitemap.xml");
  });

  it("keeps previews, staging and local runs out of search results", () => {
    for (const env of [{ VERCEL_ENV: "preview" }, {}]) {
      expect(robotsFor("https://x.example", env)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    }
  });
});

describe("sitemap.xml", () => {
  it("lists the public pages and every tool, as absolute URLs", () => {
    const urls = sitemapFor("https://app.example", ["ad-generator", "email-writer"]).map((entry) => entry.url);
    expect(urls).toEqual([
      "https://app.example",
      "https://app.example/tools",
      "https://app.example/templates",
      "https://app.example/pricing",
      "https://app.example/faq",
      "https://app.example/changelog",
      "https://app.example/privacy",
      "https://app.example/terms",
      "https://app.example/tools/ad-generator",
      "https://app.example/tools/email-writer",
    ]);
  });
});

describe("site settings", () => {
  it("takes the public address from NEXT_PUBLIC_SITE_URL, then Vercel's production domain", () => {
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "https://app.example/" })).toBe("https://app.example");
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "amw.vercel.app" })).toBe("https://amw.vercel.app");
    expect(siteOrigin({})).toBe("http://localhost:3000");
  });

  it("uses the configured support address", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "help@app.example");
    expect(supportEmail()).toBe("help@app.example");
    vi.unstubAllEnvs();
  });

  it("repeats a page's title and description in its link preview, with a canonical URL", () => {
    expect(pageMetadata("Pricing", "Plans", "/pricing")).toMatchObject({
      title: "Pricing",
      alternates: { canonical: "/pricing" },
      openGraph: { title: "Pricing", description: "Plans", url: "/pricing" },
      twitter: { card: "summary_large_image", title: "Pricing" },
    });
  });
});

describe("who runs the service (Privacy, Terms)", () => {
  it("shows placeholders and marks the pages as a draft until all three are set", () => {
    vi.stubEnv("LEGAL_OPERATOR", "");
    vi.stubEnv("LEGAL_COUNTRY", "Ireland");
    vi.stubEnv("EMAIL_PROVIDER", "Resend");
    expect(legalFacts()).toEqual({
      operator: "[Company name and address]",
      country: "Ireland",
      emailProvider: "Resend",
      draft: true,
    });
    vi.stubEnv("LEGAL_OPERATOR", "Example Ltd, 1 Main St, Dublin");
    expect(legalFacts()).toMatchObject({ operator: "Example Ltd, 1 Main St, Dublin", draft: false });
    vi.unstubAllEnvs();
  });
});

