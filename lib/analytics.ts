import "server-only";
import { logger } from "@/lib/logger";

/**
 * Product analytics: a handful of funnel events, sent from the server to
 * PostHog's capture API — no SDK, nothing in the browser, no cookies. Off
 * without POSTHOG_KEY (local dev, CI).
 *
 * `distinctId` is a user id, or a guest session id before sign-up (the
 * guest→user merge links the two). Properties never carry personal data or
 * user-written content — ids and slugs only.
 *
 * Awaited, with a short timeout, so the event is sent before a serverless
 * function ends; a failure is logged and otherwise ignored.
 */
export async function track(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const key = process.env.POSTHOG_KEY;
  if (!key) return;

  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, distinct_id: distinctId },
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) logger.warn("analytics: event refused", { event, status: res.status });
  } catch (error) {
    logger.warn("analytics: event not sent", { event, error });
  }
}
