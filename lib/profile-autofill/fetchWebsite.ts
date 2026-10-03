import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";

/**
 * Fetches a company's public website for profile autofill (Stage 12,
 * architecture doc §9 "Company Profile — full form + autofill by URL")
 * and reduces it to the few things worth handing to the AI.
 *
 * The URL is user-supplied and fetched from our server, so this is an
 * SSRF boundary, handled deliberately rather than with a bare `fetch()`:
 *  - only http/https, only the default ports;
 *  - the hostname is resolved first and refused if ANY address it maps to
 *    is loopback / private / link-local / otherwise non-public;
 *  - the connection is made to that already-vetted address (a pinned
 *    `lookup`), so a DNS answer can't change between the check and the
 *    request (DNS rebinding);
 *  - redirects are followed by hand, each hop re-validated the same way;
 *  - hard timeout and response-size cap; only HTML is read.
 */

export class WebsiteFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteFetchError";
  }
}

export interface WebsiteSummary {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  /** Visible page text, whitespace-collapsed and truncated. */
  text: string;
}

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 6_000;

export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new WebsiteFetchError("Enter your website address.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new WebsiteFetchError("That doesn't look like a website address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new WebsiteFetchError("Only http and https websites are supported.");
  }
  if (url.port !== "") {
    throw new WebsiteFetchError("Website addresses with a custom port aren't supported.");
  }
  if (url.username || url.password) {
    throw new WebsiteFetchError("Website addresses with credentials aren't supported.");
  }
  return url;
}

export async function fetchWebsiteSummary(input: string): Promise<WebsiteSummary> {
  let url = normalizeWebsiteUrl(input);
  const deadline = Date.now() + TIMEOUT_MS;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const address = await resolvePublicAddress(url.hostname);
    const response = await request(url, address, deadline);

    if (response.redirect) {
      url = normalizeWebsiteUrl(new URL(response.redirect, url).toString());
      continue;
    }
    return summarizeHtml(url.toString(), response.body);
  }

  throw new WebsiteFetchError("That website redirects too many times.");
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const candidates = isIP(host)
    ? [{ address: host, family: isIP(host) as 4 | 6 }]
    : await lookup(host, { all: true, verbatim: true }).catch(() => {
        throw new WebsiteFetchError("We couldn't find that website.");
      });

  if (candidates.length === 0) throw new WebsiteFetchError("We couldn't find that website.");
  if (candidates.some((c) => !isPublicAddress(c.address))) {
    throw new WebsiteFetchError("That address isn't a public website.");
  }
  const first = candidates[0]!;
  return { address: first.address, family: first.family === 6 ? 6 : 4 };
}

/** Exported for tests. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIPv4(address);
  if (version === 6) {
    const lower = address.toLowerCase();
    // IPv4-mapped (::ffff:a.b.c.d) — judge by the embedded IPv4 address.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIPv4(mapped[1]!);
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const high = Number.parseInt(mappedHex[1]!, 16);
      const low = Number.parseInt(mappedHex[2]!, 16);
      return isPublicIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    if (lower === "::" || lower === "::1") return false;
    const firstHextet = Number.parseInt(lower.split(":")[0] || "0", 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
    if ((firstHextet & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
    if ((firstHextet & 0xff00) === 0xff00) return false; // ff00::/8 multicast
    if (lower.startsWith("64:ff9b:") || lower.startsWith("2001:db8:")) return false;
    return true;
  }
  return false;
}

function isPublicIPv4(address: string): boolean {
  const [a, b, c] = address.split(".").map(Number) as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false; // "this", private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

function request(
  url: URL,
  pinned: { address: string; family: 4 | 6 },
  deadline: number,
): Promise<{ redirect: string | null; body: string }> {
  const client = url.protocol === "https:" ? https : http;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new WebsiteFetchError("That website took too long to respond."));

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "AIMarketingWorkspace-ProfileAutofill/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: remaining,
        // Connect to the address that was already checked, whatever DNS
        // says now. TLS still verifies the certificate against the
        // hostname (SNI/servername come from the URL, not from this).
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options?.all) {
            callback(null, [{ address: pinned.address, family: pinned.family }]);
          } else {
            callback(null, pinned.address, pinned.family);
          }
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          resolve({ redirect: res.headers.location, body: "" });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new WebsiteFetchError(`That website responded with an error (HTTP ${status}).`));
          return;
        }
        const type = String(res.headers["content-type"] ?? "");
        if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
          res.resume();
          reject(new WebsiteFetchError("That address doesn't serve a web page."));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            // Enough to read the head and the start of the body; stop there.
            res.destroy();
            resolve({ redirect: null, body: Buffer.concat(chunks).toString("utf8") });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ redirect: null, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => reject(new WebsiteFetchError("We couldn't read that website.")));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new WebsiteFetchError("That website took too long to respond."));
    });
    req.on("error", (error) => {
      if (error instanceof WebsiteFetchError) reject(error);
      else reject(new WebsiteFetchError("We couldn't connect to that website."));
    });
    req.end();
  });
}

/** Exported for tests. */
export function summarizeHtml(url: string, html: string): WebsiteSummary {
  const meta = (key: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    return content ? clean(decodeEntities(content)) : null;
  };
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  const text = clean(
    decodeEntities(
      html
        .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  ).slice(0, MAX_TEXT_CHARS);

  return {
    url,
    title: title ? clean(decodeEntities(title)) || null : null,
    description: meta("description") ?? meta("og:description"),
    siteName: meta("og:site_name"),
    text,
  };
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}
