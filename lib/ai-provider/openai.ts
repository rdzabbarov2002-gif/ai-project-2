import "server-only";
import OpenAI from "openai";
import type {
  AIProvider,
  AIGenerateParams,
  AIGenerateResult,
  AIProviderErrorKind,
} from "./types";
import { AIProviderError } from "./types";
import { withRetry } from "./retry";

/**
 * Maps the OpenAI SDK's own exception types to our provider-agnostic
 * AIProviderErrorKind — the one place in the codebase that knows they
 * exist, as claude.ts is for Anthropic's.
 */
function classifyError(error: unknown): AIProviderErrorKind {
  // A 429 with this code isn't a rate limit: the account has run out of
  // prepaid credit (or hit its budget). Waiting won't fix it, topping up
  // will — so it's reported as our misconfiguration, never retried.
  if (error instanceof OpenAI.RateLimitError && error.code === "insufficient_quota") {
    return "configuration";
  }
  if (error instanceof OpenAI.AuthenticationError) return "authentication";
  if (error instanceof OpenAI.PermissionDeniedError) return "authentication";
  if (error instanceof OpenAI.RateLimitError) return "rate_limited";
  // 404 is a model this key can't use (a wrong DEFAULT_AI_MODEL) — a
  // malformed request as far as we're concerned, like a 400.
  if (error instanceof OpenAI.BadRequestError) return "invalid_request";
  if (error instanceof OpenAI.NotFoundError) return "invalid_request";
  if (error instanceof OpenAI.UnprocessableEntityError) return "invalid_request";
  if (error instanceof OpenAI.InternalServerError) return "overloaded";
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.APIConnectionError) return "network";
  return "unknown";
}

/**
 * GPT models through OpenAI's Responses API — the project's default
 * provider (config/settings.ts). Same contract as ClaudeProvider: one
 * retry for transient failures inside one time budget (retry.ts), errors
 * as AIProviderError, an answer with no text treated as an error.
 */
export class OpenaiProvider implements AIProvider {
  readonly name = "openai" as const;

  private client: OpenAI | null = null;

  /** Lazy per provider instance, for the same reasons as in claude.ts. */
  private getClient(): OpenAI {
    if (this.client) return this.client;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        this.name,
        "configuration",
        "OPENAI_API_KEY is not set. Add it to .env.local (see .env.example).",
      );
    }

    // The retry loop (retry.ts) is the only one: the SDK's own retries
    // (2 by default, timeouts included) would multiply the time budget.
    this.client = new OpenAI({ apiKey, maxRetries: 0 });
    return this.client;
  }

  async generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const client = this.getClient();

    const response = await withRetry(this.name, params.timeoutMs, classifyError, (timeLeftMs) =>
      client.responses.create(
        {
          model: params.model,
          instructions: params.systemPrompt,
          input: params.userPrompt,
          // Reasoning counts toward this cap too (see config/settings.ts).
          max_output_tokens: params.maxTokens,
          // Current GPT models (gpt-5.x, gpt-6.x) reason before answering.
          // "low" is plenty for marketing copy and keeps an answer well
          // inside the time budget; every current reasoning model accepts
          // it. `params.temperature` is not forwarded: these models reject
          // sampling parameters unless reasoning is turned off.
          reasoning: { effort: "low" },
          // The result is saved here (generations), so OpenAI needn't keep
          // a copy for later retrieval.
          store: false,
        },
        { timeout: timeLeftMs, signal: params.signal },
      ),
    );

    // Joined text of the answer's messages; reasoning and refusals aren't in it.
    const text = response.output_text;

    if (!text.trim()) {
      // e.g. a refusal, or the whole budget spent on reasoning
      // (incomplete: max_output_tokens). Thrown (not returned) so the
      // pipeline neither saves an empty generation nor counts it against
      // the caller's usage.
      const reason = response.incomplete_details?.reason;
      throw new AIProviderError(
        this.name,
        "unknown",
        `GPT returned no text (status: ${response.status ?? "unknown"}${reason ? `, ${reason}` : ""}).`,
      );
    }

    return {
      text,
      usage: {
        // Reasoning is billed as output and already included in output_tokens.
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
      provider: this.name,
      model: response.model,
    };
  }
}
