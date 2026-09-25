import "server-only";
import type { AIProvider, AIProviderName } from "./types";
import { AIProviderError } from "./types";
import { ClaudeProvider } from "./claude";
import { OpenaiProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { MistralProvider } from "./mistral";
import { GrokProvider } from "./grok";

/**
 * Provider factory — the single place that maps a config-driven name to an
 * implementation. `/api/generate` (Stage 5) and future tool configs
 * (config/tools.json, plan_limits.allowed_ai_models) reference providers by
 * this name string, never by importing a vendor SDK directly. `server-only`
 * above makes an accidental client-side import of this file (or any
 * provider it wires up) a build error instead of a runtime key leak — see
 * the Stage 4 audit report for the full reasoning.
 */
const registry: Record<AIProviderName, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  openai: () => new OpenaiProvider(),
  gemini: () => new GeminiProvider(),
  mistral: () => new MistralProvider(),
  grok: () => new GrokProvider(),
  "openai-compatible": () => new OpenaiProvider(), // shares the OpenAI wire format
};

export function getProvider(name: AIProviderName): AIProvider {
  const factory = registry[name];
  if (!factory) {
    // Not `AIProviderErrorKind: "not_implemented"` — a name outside
    // AIProviderName isn't a provider we haven't built yet, it's a config
    // value that doesn't match the type at all (e.g. a typo in a future
    // DB-driven `plan_limits.allowed_ai_models` entry once Stage 5+ reads
    // that column instead of the config/plans.json stand-in).
    throw new AIProviderError(
      name as AIProviderName,
      "configuration",
      `Unknown AI provider: "${name}"`,
    );
  }
  return factory();
}

export function getDefaultProvider(): AIProvider {
  const configured = (process.env.DEFAULT_AI_PROVIDER as AIProviderName) || "claude";
  return getProvider(configured);
}

export * from "./types";
