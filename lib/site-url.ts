import { headers } from "next/headers";

/**
 * Resolves the site's own origin for building auth redirect URLs (email
 * confirmation links, OAuth callbacks). Prefers an explicit env var — more
 * reliable behind a proxy/CDN — and falls back to request headers so local
 * dev and preview deploys work with zero config.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");

  return `${isLocal ? "http" : proto}://${host}`;
}
