import * as Sentry from "@sentry/nextjs";
import { MAX_REPORT_BODY, parseViolations } from "@/lib/csp-report";
import { ipSubject, isOverRateLimit } from "@/lib/limits/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/visitor";
import { logger } from "@/lib/logger";

/**
 * Per IP address: what a browser sends for a page with a real problem,
 * not a script spending the Sentry quota — once spent, Sentry drops real
 * errors too.
 */
const REPORT_LIMIT = { max: 20, windowSeconds: 60 * 60 };

/**
 * Where browsers report what the Content Security Policy blocked — or,
 * in Report-Only mode, would have blocked (lib/csp.ts).
 *
 * Each violation is a log line and a Sentry warning grouped by directive
 * and blocked origin, so a real problem shows up as one issue with a
 * count, and the Report-Only period can be reviewed in Sentry.
 *
 * Anyone can post here; it only ever writes logs, the body is capped,
 * reports are limited per IP address, and it always answers 204.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_REPORT_BODY) return new Response(null, { status: 204 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  const violations = parseViolations(body);
  if (violations.length === 0) return new Response(null, { status: 204 });
  if (await isOverRateLimit(createAdminClient(), ipSubject("csp", clientIp(request.headers)), REPORT_LIMIT)) {
    return new Response(null, { status: 204 });
  }

  for (const violation of violations) {
    logger.warn("csp: violation", { ...violation });
    Sentry.withScope((scope) => {
      scope.setLevel("warning");
      scope.setTag("event", "csp: violation");
      scope.setFingerprint(["csp", violation.directive, violation.blocked]);
      scope.setExtras({ ...violation });
      Sentry.captureMessage(`CSP ${violation.disposition ?? ""} ${violation.directive} blocked ${violation.blocked}`.replace(/\s+/g, " "));
    });
  }
  return new Response(null, { status: 204 });
}
