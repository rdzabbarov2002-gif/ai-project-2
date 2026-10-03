import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Structured logging: one JSON object per line, so the hosting provider's
 * log view (Vercel) can filter by level and event instead of grepping
 * free text. `error` also goes to Sentry — including the failures the app
 * handles gracefully (a failed save, a fail-open rate limit check), which
 * never throw and so would otherwise never be seen outside the raw logs.
 * Without a Sentry DSN that part is a no-op.
 *
 * Usage: `logger.error("session/merge: reassign failed", { error, guestSessionId })`.
 * `event` is a stable, grep-able name; details go in `context` (never
 * secrets or user-written content).
 *
 * Server-only: importing it from a Client Component would put the whole
 * Sentry SDK into the browser bundle. Error boundaries use
 * lib/report-client-error.ts instead.
 */

type Level = "info" | "warn" | "error";

export interface LogContext {
  /** An Error, a Supabase/PostgREST error object, or anything thrown. */
  error?: unknown;
  [key: string]: unknown;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (error && typeof error === "object") {
    // PostgREST errors are plain objects: { message, code, details, hint }.
    // `details` is left out on purpose — it can quote row values (e.g.
    // "Key (email)=(…) already exists").
    const { message, code } = error as Record<string, unknown>;
    return { message: String(message ?? "unknown error"), code };
  }
  return { message: String(error) };
}

function write(level: Level, event: string, context: LogContext = {}) {
  const { error, ...fields } = context;
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
    ...(error !== undefined && { error: serializeError(error) }),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console -- the one place info-level output is written
  else console.log(line);
}

export const logger = {
  info(event: string, context?: LogContext) {
    write("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    write("warn", event, context);
  },
  error(event: string, context: LogContext = {}) {
    write("error", event, context);

    const { error, ...fields } = context;
    Sentry.withScope((scope) => {
      scope.setTag("event", event);
      scope.setExtras(fields);
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        const detail = error === undefined ? "" : `: ${serializeError(error).message}`;
        Sentry.captureMessage(`${event}${detail}`, "error");
      }
    });
  },
};
