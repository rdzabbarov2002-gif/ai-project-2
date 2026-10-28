import { sentryOptions } from "@/lib/sentry";

/**
 * Error reporting for the browser side — the error boundaries
 * (error.tsx, global-error.tsx). Server code uses lib/logger.ts.
 *
 * The Sentry browser SDK is loaded only here, on demand, when an error is
 * actually reported: bundled up front it adds ~59 kB (gzip) to every
 * page's JavaScript, for an event most visits never have.
 *
 * An error that carries a `digest` came from the server — a Server
 * Component that threw — and was already reported to Sentry, with its
 * real message and stack, by the server-side SDK. The browser only has a
 * redacted copy of it, so it isn't sent a second time.
 */
export function reportClientError(event: string, error: Error & { digest?: string }) {
  console.error(event, error);

  if (!sentryOptions.dsn || error.digest) return;

  void import("@sentry/nextjs").then((Sentry) => {
    if (!Sentry.getClient()) Sentry.init(sentryOptions);
    Sentry.withScope((scope) => {
      scope.setTag("event", event);
      Sentry.captureException(error);
    });
  });
}
