/**
 * AI Provider Gateway — shared contract.
 *
 * Every provider (Claude, OpenAI, Gemini, Mistral, Grok, or any other
 * OpenAI-compatible API) implements this single interface. Business logic
 * (app/api/generate) only ever talks to `AIProvider`, never to a specific
 * vendor SDK — swapping or adding a provider is a config change, not a
 * rewrite of the generation pipeline.
 */

export interface AIGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
  /** Honored only by providers whose models still accept sampling
   *  parameters — ClaudeProvider ignores it (current Claude models reject
   *  `temperature` outright; see claude.ts). */
  temperature?: number;
  /** Total time the call may take, retries included — the caller's
   *  serverless time limit has to fit it. Defaults to a per-provider value
   *  if omitted (see each provider). */
  timeoutMs?: number;
  /** Lets the caller (Stage 5's /api/generate) cancel an in-flight call, e.g. on client disconnect. */
  signal?: AbortSignal;
}

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AIGenerateResult {
  text: string;
  usage: AITokenUsage;
  /** Echoes back which provider/model actually served the request, for logging in `generations`. */
  provider: AIProviderName;
  model: string;
}

/** Runtime list of the names below — lib/env.ts validates
 *  `DEFAULT_AI_PROVIDER` against it. */
export const AI_PROVIDER_NAMES = [
  "claude",
  "openai",
  "gemini",
  "mistral",
  "grok",
  "openai-compatible",
] as const;

export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

export interface AIProvider {
  readonly name: AIProviderName;
  generate(params: AIGenerateParams): Promise<AIGenerateResult>;
}

/**
 * What went wrong, in terms the *caller* needs to act on — not which SDK
 * exception was thrown. Stage 5's usage-limit logic and error messaging
 * branch on `kind`/`retryable`, never on a provider-specific error class,
 * which is exactly what keeps that code provider-agnostic.
 *
 * - configuration   — this deployment is missing/misconfigured (no API key
 *                      set for an active provider). Not the user's fault;
 *                      not retryable.
 * - not_implemented — provider is a Stage 4 stub, not yet connected.
 * - authentication  — the provider rejected our credentials.
 * - rate_limited     — provider's own rate limit hit (distinct from this
 *                      app's plan-based usage limits, which are Stage 5).
 * - invalid_request  — malformed request (bad model name, params) — a bug,
 *                      not a transient condition.
 * - overloaded       — provider is temporarily unable to serve (5xx).
 * - network          — connection-level failure reaching the provider.
 * - timeout          — the call exceeded `timeoutMs`.
 * - unknown          — anything that doesn't map to the above.
 */
export type AIProviderErrorKind =
  | "configuration"
  | "not_implemented"
  | "authentication"
  | "rate_limited"
  | "invalid_request"
  | "overloaded"
  | "network"
  | "timeout"
  | "unknown";

const RETRYABLE_KINDS: ReadonlySet<AIProviderErrorKind> = new Set([
  "overloaded",
  "network",
  "timeout",
]);

export class AIProviderError extends Error {
  public readonly retryable: boolean;

  constructor(
    public readonly provider: AIProviderName,
    public readonly kind: AIProviderErrorKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}:${kind}] ${message}`);
    this.name = "AIProviderError";
    this.retryable = RETRYABLE_KINDS.has(kind);
  }
}
