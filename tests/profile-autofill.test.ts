import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPublicAddress,
  normalizeWebsiteUrl,
  summarizeHtml,
  fetchWebsiteSummary,
} from "@/lib/profile-autofill/fetchWebsite";

const generate = vi.fn();
vi.mock("@/lib/ai-provider", () => ({ getDefaultProvider: () => ({ generate }) }));
const { extractProfile, guessNameFromMetadata } = await import("@/lib/profile-autofill/extractProfile");

describe("SSRF guard", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "192.0.2.10",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "ff02::1",
  ])("refuses non-public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "192.0.32.10", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it("normalizes a bare domain to https and refuses other schemes, ports and credentials", () => {
    expect(normalizeWebsiteUrl("example.com").toString()).toBe("https://example.com/");
    for (const bad of ["ftp://example.com", "file:///etc/passwd", "https://example.com:8443", "https://user:pw@example.com", "  ", "http://"]) {
      expect(() => normalizeWebsiteUrl(bad), bad).toThrow();
    }
  });

  it("refuses literal private addresses before any request", async () => {
    await expect(fetchWebsiteSummary("http://127.0.0.1/")).rejects.toThrow("isn't a public website");
    await expect(fetchWebsiteSummary("http://[::1]/")).rejects.toThrow("isn't a public website");
  });
});

describe("summarizeHtml", () => {
  const html = `<!doctype html><html><head>
    <title>Acme Bakery &amp; Caf&#233; | Fresh bread daily</title>
    <meta name="description" content="Sourdough &quot;baked&quot; every morning.">
    <meta property="og:site_name" content="Acme Bakery">
    <style>.x{color:red}</style><script>var secret = 1;</script>
    </head><body><h1>Welcome</h1><!-- hidden --><p>Order   online&nbsp;today.</p></body></html>`;

  it("extracts title, meta and visible text only", () => {
    const summary = summarizeHtml("https://acme.example/", html);
    expect(summary.title).toBe("Acme Bakery & Café | Fresh bread daily");
    expect(summary.description).toBe('Sourdough "baked" every morning.');
    expect(summary.siteName).toBe("Acme Bakery");
    expect(summary.text).toContain("Welcome Order online today.");
    expect(summary.text).not.toContain("secret");
    expect(summary.text).not.toContain("color:red");
    expect(summary.text).not.toContain("hidden");
  });

  it("guesses a name from the site name, else the title's first segment", () => {
    expect(guessNameFromMetadata({ siteName: "Acme", title: "Other" })).toBe("Acme");
    expect(guessNameFromMetadata({ siteName: null, title: "Acme Bakery | Fresh bread" })).toBe("Acme Bakery");
    expect(guessNameFromMetadata({ siteName: null, title: null })).toBeUndefined();
  });
});

describe("extractProfile", () => {
  const site = {
    url: "https://acme.example/",
    title: "Acme Bakery | Fresh bread",
    description: "Sourdough every morning.",
    siteName: null,
    text: "We bake.",
  };
  afterEach(() => generate.mockReset());

  it("uses the AI's JSON answer, trimmed and length-capped, tolerating stray prose", async () => {
    generate.mockResolvedValue({
      text: `Here you go:\n{"name":"  Acme Bakery ","niche":"Bakery","targetAudience":"Locals","toneOfVoice":"Warm","usp":"${"x".repeat(900)}"}`,
    });
    const { profile, source } = await extractProfile(site);
    expect(source).toBe("ai");
    expect(profile.name).toBe("Acme Bakery");
    expect(profile.usp).toHaveLength(500);
    expect(profile.websiteUrl).toBe("https://acme.example/");
  });

  it("falls back to page metadata when the AI call fails or answers nonsense", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const outcome of [() => generate.mockRejectedValue(new Error("no key")), () => generate.mockResolvedValue({ text: "no json here" })]) {
      outcome();
      const { profile, source } = await extractProfile(site);
      expect(source).toBe("metadata");
      expect(profile).toEqual({ name: "Acme Bakery", usp: "Sourdough every morning.", websiteUrl: site.url });
    }
  });
});
