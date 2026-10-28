/**
 * Sentry settings shared by the server (instrumentation.ts) and the
 * browser (lib/report-client-error.ts). Errors only — no performance
 * tracing — and only what's needed to debug them: stack traces, the
 * route, the release and environment (both set by the SDK on Vercel).
 *
 * Everything that could carry a user's data is off: request/response
 * bodies (prompts, company profiles, generated copy), cookies (session
 * tokens), headers, query strings, IPs and user fields, AI inputs/outputs,
 * database query data and local variable values in stack frames. The SDK
 * collects all of these by default.
 *
 * `dsn` is undefined in local dev and CI, which keeps the SDK off.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    stackFrameVariables: false,
  },
};
