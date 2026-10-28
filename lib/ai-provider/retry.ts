import type { AIProviderErrorKind, AIProviderName } from "./types";
import { AIProviderError } from "./types";

// Total budget for one generate() call, both attempts included: the routes
// that call the AI declare maxDuration = 60 (Vercel ends the function
// there), and the rest of the request — auth, limits, saving — needs a few
// seconds of it. Without a budget, a slow call plus its retry could run far
// past that limit and the user would get a dropped connection instead of a
// clear error.
const DEFAULT_TIMEOUT_MS = 50_000;
const MAX_ATTEMPTS = 2; // 1 initial call + 1 retry, transient failures only.
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The retry policy every provider shares: one retry, for transient
 * failures only, inside a single time budget. `call` makes the API request
 * with the time left in the budget — a retry never gets a fresh one — and
 * `classify` maps the vendor SDK's exceptions to AIProviderErrorKind, so
 * whatever is thrown from here is always an AIProviderError. The SDK's own
 * retries have to be off (`maxRetries: 0`): they would multiply the budget.
 */
export async function withRetry<T>(
  provider: AIProviderName,
  timeoutMs: number | undefined,
  classify: (error: unknown) => AIProviderErrorKind,
  call: (timeLeftMs: number) => Promise<T>,
): Promise<T> {
  const deadline = Date.now() + (timeoutMs ?? DEFAULT_TIMEOUT_MS);

  for (let attempt = 1; ; attempt++) {
    try {
      return await call(Math.max(deadline - Date.now(), 1));
    } catch (error) {
      const wrapped = new AIProviderError(
        provider,
        classify(error),
        error instanceof Error ? error.message : `Unknown error calling ${provider}`,
        error,
      );

      if (
        !wrapped.retryable ||
        attempt === MAX_ATTEMPTS ||
        deadline - Date.now() <= RETRY_DELAY_MS
      ) {
        throw wrapped;
      }
      // Transient (overloaded/network/timeout) and attempts remain — back
      // off once and retry. Anything else (auth, rate limit, bad
      // request) throws immediately above; retrying those would just
      // fail the same way again.
      await sleep(RETRY_DELAY_MS);
    }
  }
}
