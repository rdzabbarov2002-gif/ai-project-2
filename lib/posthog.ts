/**
 * One event to PostHog's capture API — no SDK, no cookies. Shared by the
 * server's funnel events (lib/analytics.ts) and the visit event sent from
 * middleware (lib/visitor.ts), so it stays free of Node-only imports.
 * Off (returns null) without POSTHOG_KEY.
 */
export async function capture(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<Response | null> {
  const key = process.env.POSTHOG_KEY;
  if (!key) return null;

  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  return fetch(`${host}/i/v0/e/`, {
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
}
