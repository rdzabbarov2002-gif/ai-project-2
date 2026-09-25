import "server-only";
import type { AIProvider, AIGenerateParams, AIGenerateResult } from "./types";
import { AIProviderError } from "./types";

/**
 * Openai provider stub. Implemented post-MVP when a second provider is
 * actually turned on for users (see project architecture doc, section 6).
 * Kept as a real file (not just a TODO) so the factory in index.ts can
 * already reference it and the "add a provider = one file + one config
 * line" claim is true from day one — Stage 4 connects Claude for real
 * (claude.ts) and brings every other provider up to the same error-contract
 * shape, without implementing the calls themselves.
 */
export class OpenaiProvider implements AIProvider {
  readonly name = "openai" as const;

  async generate(_params: AIGenerateParams): Promise<AIGenerateResult> {
    throw new AIProviderError(
      this.name,
      "not_implemented",
      "OpenaiProvider is a Stage 4 stub — not yet connected to a real API.",
    );
  }
}
