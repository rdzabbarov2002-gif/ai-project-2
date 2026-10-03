import type { NextRequest } from "next/server";
import { capture } from "@/lib/posthog";

/**
 * The first step of the funnel (visit → sign-up → first result → payment,
 * docs/launch.md): a `site_visited` event when someone who isn't signed
 * in opens a page — without cookies or anything stored on their device.
 *
 * The visitor is a pseudonymous ID: an HMAC of the date, IP address and
 * browser (user agent), keyed with a server secret. The same browser gets
 * the same ID all day and a new one the next; the IP can't be recovered
 * from it. Signing up links that day's ID to the account (app/register),
 * which is what connects a visit to what the person did after.
 *
 * Runs in middleware (Edge runtime) and in the sign-up Server Action.
 */

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\//i;
const NOT_A_PAGE = /\.(xml|txt|png|jpe?g|ico|svg|json|js|css|webmanifest)$/;

/** The key: a server-only secret every deployment has. */
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
}

export async function visitorId(ip: string, userAgent: string, key: string, now = new Date()) {
  const encoder = new TextEncoder();
  const hmac = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const day = now.toISOString().slice(0, 10);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", hmac, encoder.encode(`${day}|${ip}|${userAgent}`)));
  return `visitor_${Array.from(mac.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** This request's visitor ID, or null when visits aren't tracked. */
export async function visitorIdFrom(headers: Headers) {
  const key = secret();
  if (!process.env.POSTHOG_KEY || !key) return null;
  return visitorId(clientIp(headers), headers.get("user-agent") ?? "", key);
}

/** A person opening a page — not a prefetch, a data request, an asset or a bot. */
export function isPageVisit(method: string, pathname: string, headers: Headers) {
  if (method !== "GET" || pathname.startsWith("/api/") || pathname.startsWith("/auth/")) return false;
  if (NOT_A_PAGE.test(pathname) || pathname === "/opengraph-image") return false;
  if (headers.get("rsc") || headers.get("next-router-prefetch")) return false;
  if (headers.get("purpose") === "prefetch" || headers.get("sec-purpose")?.includes("prefetch")) return false;
  // A navigation: `sec-fetch-mode: navigate` — also when the service worker
  // (public/sw.js) forwards it, which turns `sec-fetch-dest` into "empty".
  // Clients without Fetch Metadata headers: asking for HTML.
  const mode = headers.get("sec-fetch-mode");
  const destination = headers.get("sec-fetch-dest");
  const navigation = mode
    ? mode === "navigate"
    : destination
      ? destination === "document"
      : Boolean(headers.get("accept")?.includes("text/html"));
  if (!navigation) return false;
  const userAgent = headers.get("user-agent") ?? "";
  return userAgent !== "" && !BOT.test(userAgent);
}

/** Where the visit is and came from: the page, the other site, the campaign tags. */
export function visitProperties(url: URL, referer: string | null) {
  const properties: Record<string, string> = { path: url.pathname };
  if (referer) {
    try {
      const from = new URL(referer);
      if (from.host !== url.host) properties.referrer_domain = from.hostname;
    } catch {
      // Not a URL: no referrer.
    }
  }
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = url.searchParams.get(key);
    if (value) properties[key] = value.slice(0, 100);
  }
  return properties;
}

/** Sends `site_visited` in the background (`waitUntil`) — never delays or fails the page. */
export function trackVisit(request: NextRequest, waitUntil: (promise: Promise<unknown>) => void) {
  if (!process.env.POSTHOG_KEY || !isPageVisit(request.method, request.nextUrl.pathname, request.headers)) return;
  waitUntil(
    (async () => {
      const id = await visitorIdFrom(request.headers);
      if (id) await capture("site_visited", id, visitProperties(request.nextUrl, request.headers.get("referer")));
    })().catch(() => {}),
  );
}
