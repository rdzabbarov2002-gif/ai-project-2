/**
 * Turns what browsers post to /api/csp-report into violations worth
 * reporting (app/api/csp-report/route.ts). Both formats: `report-uri`
 * sends one `application/csp-report` object, `report-to` (the Reporting
 * API) an `application/reports+json` batch.
 *
 * Violations caused by browser extensions (their scripts run in the page
 * and trip the policy) are dropped. URLs lose their query string and
 * fragment, which can carry tokens (auth callback codes).
 */

export const MAX_REPORT_BODY = 64 * 1024;
const MAX_REPORTS = 10;
const EXTENSION = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/;

export interface Violation {
  document: string;
  directive: string;
  blocked: string;
  source?: string;
  line?: number;
  disposition?: string;
}

/** A URL without query or fragment; keywords like `inline` as they are. */
function clean(value: unknown) {
  const text = typeof value === "string" ? value : "";
  try {
    const url = new URL(text);
    return url.protocol.startsWith("http") ? `${url.origin}${url.pathname}` : `${url.protocol}`;
  } catch {
    return text.slice(0, 100);
  }
}

function fromReport(report: Record<string, unknown>): Violation {
  // report-uri uses kebab-case keys, the Reporting API camelCase.
  const pick = (...keys: string[]) => keys.map((key) => report[key]).find((value) => value !== undefined);
  const line = Number(pick("line-number", "lineNumber"));
  return {
    document: clean(pick("document-uri", "documentURL")),
    directive: String(pick("effective-directive", "effectiveDirective", "violated-directive") ?? "unknown").split(" ")[0]!,
    blocked: clean(pick("blocked-uri", "blockedURL")),
    source: pick("source-file", "sourceFile") ? clean(pick("source-file", "sourceFile")) : undefined,
    line: Number.isFinite(line) && line > 0 ? line : undefined,
    disposition: typeof pick("disposition") === "string" ? String(pick("disposition")) : undefined,
  };
}

export function parseViolations(body: unknown): Violation[] {
  const reports = Array.isArray(body)
    ? body.filter((entry) => entry?.type === "csp-violation").map((entry) => entry.body)
    : [(body as Record<string, unknown> | null)?.["csp-report"]];
  return reports
    .filter((report): report is Record<string, unknown> => Boolean(report) && typeof report === "object")
    .slice(0, MAX_REPORTS)
    .map(fromReport)
    .filter((violation) => !EXTENSION.test(violation.blocked) && !EXTENSION.test(violation.source ?? ""));
}
