import "server-only";
import { after } from "next/server";
import { logger } from "@/lib/logger";
import { capture } from "@/lib/posthog";

/**
 * Product analytics: a handful of funnel events, sent from the server to
 * PostHog's capture API — no SDK, nothing in the browser, no cookies. Off
 * without POSTHOG_KEY (local dev, CI).
 *
 * `distinctId` is a user id, or a guest session id before sign-up (the
 * guest→user merge links the two). Properties never carry personal data or
 * user-written content — ids and slugs only.
 *
 * Sent once the response has gone (`after`, which keeps a serverless
 * function running until it's done), so an event never delays a page or
 * an answer — not even when PostHog is slow; outside a request (scripts,
 * tests) it's sent right away. A failure is logged and otherwise ignored.
 */
export async function track(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const send = async () => {
    try {
      const res = await capture(event, distinctId, properties);
      if (res && !res.ok)
        logger.warn("analytics: event refused", { event, status: res.status });
    } catch (error) {
      logger.warn("analytics: event not sent", { event, error });
    }
  };
  try {
    after(send);
  } catch {
    // `after` throws outside a request.
    await send();
  }
}
