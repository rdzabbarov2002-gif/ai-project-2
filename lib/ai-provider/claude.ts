import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIGenerateParams,
  AIGenerateResult,
  AIProviderErrorKind,
} from "./types";
import { AIProviderError } from "./types";
import { withRetry } from "./retry";

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

    // The retry loop (retry.ts) is the only one: the SDK's own retries
    // (2 by default, timeouts included) would multiply the time budget.
    this.client = new Anthropic({ apiKey, maxRetries: 0 });
    return this.client;
  }

  async generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const client = this.getClient();

    // `params.temperature` is deliberately not forwarded: current Claude
    // models (Sonnet 5 and Opus 5 onward) removed sampling parameters and
    // reject a request carrying `temperature` with a 400. The field stays on
    // the provider-agnostic AIGenerateParams contract for providers that
    // still accept it.
    const response = await withRetry(this.name, params.timeoutMs, classifyError, (timeLeftMs) =>
      client.messages.create(
        {
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.systemPrompt,
          messages: [{ role: "user", content: params.userPrompt }],
        },
        { timeout: timeLeftMs, signal: params.signal },
      ),
    );

    // Thinking blocks (adaptive thinking is on by default for current
    // models) are skipped — only the visible answer is the product.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) {
      // e.g. stop_reason "refusal", or the whole budget spent before any
      // visible text. Thrown (not returned) so the pipeline neither saves
      // an empty generation nor counts it against the caller's usage.
      throw new AIProviderError(
        this.name,
        "unknown",
        `Claude returned no text (stop_reason: ${response.stop_reason ?? "unknown"}).`,
      );
    }

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      provider: this.name,
      model: response.model,
    };
  }
}
