import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIGenerateParams,
  AIGenerateResult,
  AIProviderErrorKind,
} from "./types";
import { AIProviderError } from "./types";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2; // 1 initial call + 1 retry, transient failures only.
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Maps the Anthropic SDK's own exception types to our provider-agnostic
 * AIProviderErrorKind. This is the one place in the codebase allowed to
 * know that `Anthropic.AuthenticationError` exists — everything above the
 * gateway (Stage 5's pipeline, usage-limit logic) only ever sees
 * `AIProviderError.kind`.
 */
function classifyError(error: unknown): AIProviderErrorKind {
  if (error instanceof Anthropic.AuthenticationError) return "authentication";
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.BadRequestError) return "invalid_request";
  if (error instanceof Anthropic.InternalServerError) return "overloaded";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "network";
  return "unknown";
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;

  private client: Anthropic | null = null;

  /**
   * Lazy singleton per provider instance, not module-level: the factory
   * (index.ts) creates a fresh provider per call, so this only avoids
   * re-reading env vars across repeated `generate()` calls on the same
   * instance, without any request-scoped state leaking between requests
   * (there is none — the SDK client itself is stateless).
   */
  private getClient(): Anthropic {
    if (this.client) return this.client;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        this.name,
        "configuration",
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example).",
      );
    }

    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const client = this.getClient();
    const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await client.messages.create(
          {
            model: params.model,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            system: params.systemPrompt,
            messages: [{ role: "user", content: params.userPrompt }],
          },
          { timeout: timeoutMs, signal: params.signal },
        );

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        return {
          text,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          provider: this.name,
          model: response.model,
        };
      } catch (error) {
        lastError = error;
        const kind = classifyError(error);
        const wrapped = new AIProviderError(
          this.name,
          kind,
          error instanceof Error ? error.message : "Unknown error calling Claude",
          error,
        );

        if (!wrapped.retryable || attempt === MAX_ATTEMPTS) {
          throw wrapped;
        }
        // Transient (overloaded/network/timeout) and attempts remain — back
        // off once and retry. Anything else (auth, rate limit, bad
        // request) throws immediately above; retrying those would just
        // fail the same way again.
        await sleep(RETRY_DELAY_MS);
      }
    }

    // Unreachable — the loop always either returns or throws — but keeps
    // TypeScript's control-flow analysis happy without a non-null assertion.
    throw new AIProviderError(
      this.name,
      "unknown",
      "Exhausted retry attempts without a definitive error.",
      lastError,
    );
  }
}
