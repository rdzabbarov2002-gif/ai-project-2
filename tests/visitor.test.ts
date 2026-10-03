import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { clientIp, isPageVisit, trackVisit, visitProperties, visitorId, visitorIdFrom } from "@/lib/visitor";

const CHROME = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140 Safari/537.36";
const page = (extra: Record<string, string> = {}) =>
  new Headers({ "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", "user-agent": CHROME, ...extra });

describe("visitor ID", () => {
  const day = new Date("2026-10-01T09:00:00Z");

  it("is the same for one browser all day, and new the next day", async () => {
    const id = await visitorId("203.0.113.7", CHROME, "secret", day);
    expect(id).toMatch(/^visitor_[0-9a-f]{32}$/);
    expect(await visitorId("203.0.113.7", CHROME, "secret", new Date("2026-10-01T23:59:00Z"))).toBe(id);
    expect(await visitorId("203.0.113.7", CHROME, "secret", new Date("2026-10-02T00:01:00Z"))).not.toBe(id);
  });

  it("differs by address, browser and key, and doesn't contain the address", async () => {
    const id = await visitorId("203.0.113.7", CHROME, "secret", day);
    expect(await visitorId("203.0.113.8", CHROME, "secret", day)).not.toBe(id);
    expect(await visitorId("203.0.113.7", "Firefox", "secret", day)).not.toBe(id);
    expect(await visitorId("203.0.113.7", CHROME, "other-secret", day)).not.toBe(id);
    expect(id).not.toContain("203");
  });

  it("takes the client's address from the proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });
});

describe("what counts as a visit", () => {
  it("a person opening a page", () => {
    expect(isPageVisit("GET", "/", page())).toBe(true);
    expect(isPageVisit("GET", "/pricing", new Headers({ accept: "text/html", "user-agent": CHROME }))).toBe(true);
  });

  it("a navigation the service worker forwards", () => {
    expect(isPageVisit("GET", "/pricing", page({ "sec-fetch-dest": "empty" }))).toBe(true);
  });

  it("not data requests, prefetches, assets, APIs or bots", () => {
    expect(isPageVisit("POST", "/", page())).toBe(false);
    expect(isPageVisit("GET", "/tools", page({ rsc: "1" }))).toBe(false);
    expect(isPageVisit("GET", "/tools", page({ "next-router-prefetch": "1" }))).toBe(false);
    expect(isPageVisit("GET", "/tools", page({ "sec-purpose": "prefetch" }))).toBe(false);
    expect(isPageVisit("GET", "/sitemap.xml", page())).toBe(false);
    expect(isPageVisit("GET", "/opengraph-image", page())).toBe(false);
    expect(isPageVisit("GET", "/api/health", page())).toBe(false);
    expect(isPageVisit("GET", "/", page({ "sec-fetch-dest": "image", "sec-fetch-mode": "no-cors" }))).toBe(false);
    expect(isPageVisit("GET", "/", page({ "sec-fetch-dest": "empty", "sec-fetch-mode": "cors" }))).toBe(false);
    expect(isPageVisit("GET", "/", page({ "user-agent": "Googlebot/2.1" }))).toBe(false);
    expect(isPageVisit("GET", "/", page({ "user-agent": "LinkedInBot/1.0 (preview)" }))).toBe(false);
    expect(isPageVisit("GET", "/", page({ "user-agent": "" }))).toBe(false);
  });

  it("records the page, the other site and the campaign tags — nothing else", () => {
    const url = new URL("https://app.example/tools?utm_source=producthunt&utm_medium=launch&utm_campaign=v1&email=x@y");
    expect(visitProperties(url, "https://www.producthunt.com/posts/amw?ref=1")).toEqual({
      path: "/tools",
      referrer_domain: "www.producthunt.com",
      utm_source: "producthunt",
      utm_medium: "launch",
      utm_campaign: "v1",
    });
    expect(visitProperties(new URL("https://app.example/faq"), "https://app.example/")).toEqual({ path: "/faq" });
  });
});

describe("sending the visit", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}"));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const request = () =>
    new NextRequest("https://app.example/?utm_source=reddit", {
      headers: { "sec-fetch-dest": "document", "user-agent": CHROME, "x-forwarded-for": "203.0.113.7" },
    });

  it("sends site_visited in the background under the day's visitor ID", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    const pending: Promise<unknown>[] = [];
    trackVisit(request(), (promise) => pending.push(promise));
    await Promise.all(pending);

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.event).toBe("site_visited");
    expect(body.distinct_id).toBe(await visitorIdFrom(request().headers));
    expect(body.properties).toMatchObject({ path: "/", utm_source: "reddit" });
    expect(JSON.stringify(body)).not.toContain("203.0.113.7");
  });

  it("does nothing without PostHog", () => {
    vi.stubEnv("POSTHOG_KEY", "");
    const pending: Promise<unknown>[] = [];
    trackVisit(request(), (promise) => pending.push(promise));
    expect(pending).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
