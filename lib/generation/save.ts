import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Identity } from "./identity";
import type { UsagePeriod } from "./period";
import type { AIGenerateResult } from "@/lib/ai-provider";
import type { ResolvedTool, ResolvedTemplate } from "./catalog";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";

export interface SaveGenerationParams {
  /** Service-role client (see lib/supabase/admin.ts). */
  adminClient: SupabaseClient<Database>;
  identity: Identity;
  tool: ResolvedTool;
  template: ResolvedTemplate | null;
  companyProfileId: string | null;
  inputParams: Record<string, unknown>;
  result: AIGenerateResult;
  /** How long the AI call took — with the token counts, what pricing is set from. */
  durationMs: number;
}

export interface SaveGenerationOutcome {
  id: string | null;
  saved: boolean;
}

/**
 * Admin client for every row, a signed-in user's included: only the
 * server saves generations — clients hold no INSERT privilege on the
 * table (migration 0026), since one through the public API would skip
 * the limits. The owner comes from the identity the pipeline resolved
 * from the session, never from the request body.
 *
 * Never throws: a failed save doesn't mean the AI call failed too — the
 * text the person is looking at already exists. Swallowing the DB error
 * here and reporting `saved: false` instead means the route can still
 * hand back the generated output (so they can copy it) rather than
 * discarding a paid-for AI response because of an unrelated storage
 * hiccup.
 */
export async function saveGeneration(
  params: SaveGenerationParams,
): Promise<SaveGenerationOutcome> {
  const row = {
    user_id: params.identity.type === "user" ? params.identity.userId : null,
    guest_session_id: params.identity.type === "guest" ? params.identity.guestSessionId : null,
    company_profile_id: params.companyProfileId,
    tool_id: params.tool.id,
    template_id: params.template?.id ?? null,
    ai_provider: params.result.provider,
    ai_model: params.result.model,
    input_params: params.inputParams as TablesInsert<"generations">["input_params"],
    output: params.result.text,
    input_tokens: params.result.usage.inputTokens,
    output_tokens: params.result.usage.outputTokens,
    duration_ms: params.durationMs,
  };

  const { data, error } = await params.adminClient.from("generations").insert(row).select("id").single();

  if (error || !data) {
    logger.error("generations: save failed", { error: error ?? "no row returned" });
    return { id: null, saved: false };
  }

  return { id: data.id, saved: true };
}

/**
 * User-only: guest usage is derived on read (countGuestGenerations in
 * checkUsage.ts), not accumulated in a counter, so there's nothing to
 * increment for a guest identity.
 *
 * Uses the `increment_usage_counter` Postgres function (migration 0011)
 * rather than a select-then-update from this client — two round trips
 * with no transaction between them would race under real concurrent
 * requests from the same user (two tabs, a retry). The function performs
 * an atomic upsert; this call either creates the period's row at count 1
 * or increments it, with no window for a lost update.
 *
 * Counted even if `saveGeneration` above reported `saved: false`: the AI
 * provider call already happened and already cost real money regardless
 * of whether the DB write succeeded, so not counting it would let a
 * transient storage failure become a free, uncounted generation.
 */
export async function incrementUsage(
  adminClient: SupabaseClient<Database>,
  identity: Identity,
  period: UsagePeriod,
): Promise<void> {
  if (identity.type !== "user") return;

  const { error } = await adminClient.rpc("increment_usage_counter", {
    p_user_id: identity.userId,
    p_period_start: period.start,
    p_period_end: period.end,
  });

  if (error) {
    // Not thrown: the generation already succeeded and (if saveGeneration
    // succeeded) is already saved. Losing an increment means this one
    // period undercounts by one — worth logging, not worth failing an
    // otherwise-successful request over.
    logger.error("usage_counters: increment failed", { error });
  }
}
