import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn(), setFingerprint: vi.fn(), setExtras: vi.fn() };
  return {
    scope,
    withScope: vi.fn((callback: (s: typeof scope) => void) => callback(scope)),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
  };
});
vi.mock("@sentry/nextjs", () => sentry);

import { buildCsp, createNonce, cspHeaderName, cspMode } from "@/lib/csp";
import { parseViolations } from "@/lib/csp-report";
import { POST } from "@/app/api/csp-report/route";

function directives(policy: string) {
  return new Map(
    policy.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name!, values];
    }),
  );
}

describe("buildCsp", () => {
  const policy = directives(
    buildCsp({
      nonce: "abc123",
      supabaseUrl: "https://proj.supabase.co/",
      sentryDsn: "https://key@o1.ingest.us.sentry.io/42",
    }),
  );

  it("runs only scripts with this response's nonce, and what they load", () => {
    expect(policy.get("script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(policy.get("script-src")).not.toContain("'unsafe-inline'");
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'none'"]);
  });

  it("connects only to the app, Supabase and Sentry's ingest", () => {
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://proj.supabase.co",
      "https://o1.ingest.us.sentry.io",
    ]);
  });

  it("keeps the app out of frames and lets forms reach Stripe's pages", () => {
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual([
      "'self'",
      "https://checkout.stripe.com",
      "https://billing.stripe.com",
    ]);
  });

  it("reports violations to the app", () => {
    expect(policy.get("report-uri")).toEqual(["/api/csp-report"]);
    expect(policy.get("report-to")).toEqual(["csp"]);
  });

  it("leaves out services that aren't configured, and allows eval only in development", () => {
    const bare = directives(buildCsp({ nonce: "n" }));
    expect(bare.get("connect-src")).toEqual(["'self'"]);
    expect(bare.get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives(buildCsp({ nonce: "n", dev: true })).get("script-src")).toContain("'unsafe-eval'");
  });
});

describe("CSP mode and nonce", () => {
  it("enforces unless CSP_REPORT_ONLY=true", () => {
    expect(cspMode({})).toBe("enforce");
    expect(cspMode({ CSP_REPORT_ONLY: "false" })).toBe("enforce");
    expect(cspMode({ CSP_REPORT_ONLY: "true" })).toBe("report-only");
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
    expect(cspHeaderName("report-only")).toBe("Content-Security-Policy-Report-Only");
  });

  it("makes a new 128-bit nonce each time", () => {
    const nonce = createNonce();
    expect(atob(nonce)).toHaveLength(16);
    expect(createNonce()).not.toBe(nonce);
  });
});

describe("parseViolations", () => {
  it("reads a report-uri report and drops query strings", () => {
    expect(
      parseViolations({
        "csp-report": {
          "document-uri": "https://app.example/auth/callback?code=secret#x",
          "violated-directive": "script-src-elem",
          "effective-directive": "script-src-elem",
          "blocked-uri": "https://evil.example/x.js?token=1",
          "source-file": "https://app.example/page",
          "line-number": 12,
          disposition: "enforce",
        },
      }),
    ).toEqual([
      {
        document: "https://app.example/auth/callback",
        directive: "script-src-elem",
        blocked: "https://evil.example/x.js",
        source: "https://app.example/page",
        line: 12,
        disposition: "enforce",
      },
    ]);
  });

  it("reads a Reporting API batch, keeping only CSP reports", () => {
    const violations = parseViolations([
      { type: "deprecation", body: {} },
      {
        type: "csp-violation",
        body: { documentURL: "https://app.example/", effectiveDirective: "script-src-elem", blockedURL: "inline", disposition: "report" },
      },
    ]);
    expect(violations).toEqual([
      { document: "https://app.example/", directive: "script-src-elem", blocked: "inline", disposition: "report" },
    ]);
  });

  it("ignores what browser extensions trip, and junk", () => {
    expect(
      parseViolations({ "csp-report": { "document-uri": "https://app.example/", "blocked-uri": "chrome-extension://abc/x.js" } }),
    ).toEqual([]);
    expect(parseViolations(null)).toEqual([]);
    expect(parseViolations({ hello: "world" })).toEqual([]);
    expect(parseViolations([1, "x", null])).toEqual([]);
  });
});

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const post = (body: string) => POST(new Request("http://localhost/api/csp-report", { method: "POST", body }));

  it("logs each violation and sends it to Sentry as a grouped warning", async () => {
    const res = await post(
      JSON.stringify({ "csp-report": { "document-uri": "https://app.example/", "effective-directive": "connect-src", "blocked-uri": "https://api.other.example/v1" } }),
    );
    expect(res.status).toBe(204);
    expect(sentry.scope.setLevel).toHaveBeenCalledWith("warning");
    expect(sentry.scope.setFingerprint).toHaveBeenCalledWith(["csp", "connect-src", "https://api.other.example/v1"]);
    expect(sentry.captureMessage).toHaveBeenCalledWith("CSP connect-src blocked https://api.other.example/v1");
  });

  it("answers 204 to anything else without reporting it", async () => {
    expect((await post("not json")).status).toBe(204);
    expect((await post("x".repeat(70_000))).status).toBe(204);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });
});
