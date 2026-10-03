import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * What generations cost at the AI provider, from the token counts every
 * generation stores (Phase 4). Prices: Claude Sonnet 5, the default model,
 * in USD per million tokens — update with Anthropic's pricing page
 * (docs/billing.md, "Margins", uses the same).
 */
export const AI_PRICE_PER_MILLION = { input: 2, output: 10 };

/** The alert threshold when AI_DAILY_BUDGET_USD isn't set. */
export const DEFAULT_DAILY_BUDGET_USD = 10;

const PAGE = 1000;

export interface AiSpend {
  generations: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function costUsd(inputTokens: number, outputTokens: number) {
  return (inputTokens * AI_PRICE_PER_MILLION.input + outputTokens * AI_PRICE_PER_MILLION.output) / 1_000_000;
}

/** Tokens and cost of every generation (guests' too) since `since`. */
export async function aiSpendSince(admin: SupabaseClient<Database>, since: Date): Promise<AiSpend> {
  const spend = { generations: 0, inputTokens: 0, outputTokens: 0 };
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("generations")
      .select("input_tokens, output_tokens")
      .gte("created_at", since.toISOString())
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Generations not read: ${error.message}`);
    for (const row of data ?? []) {
      spend.generations += 1;
      spend.inputTokens += row.input_tokens ?? 0;
      spend.outputTokens += row.output_tokens ?? 0;
    }
    if (!data || data.length < PAGE) break;
  }
  return { ...spend, costUsd: Math.round(costUsd(spend.inputTokens, spend.outputTokens) * 100) / 100 };
}
