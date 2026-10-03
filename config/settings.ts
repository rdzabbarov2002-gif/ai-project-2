/**
 * Central application settings sourced from env vars, so nothing else in
 * the codebase reads `process.env` directly (keeps Stage 1's "config not
 * code" principle consistent for non-JSON settings too).
 */
function positiveIntFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const appSettings = {
  defaultAIProvider: process.env.DEFAULT_AI_PROVIDER ?? "claude",
  defaultAIModel: process.env.DEFAULT_AI_MODEL ?? "claude-sonnet-5",
  guestSessionTtlDays: 30,
  /** Architecture doc §8: a guest gets this many generations in total
   *  (not per month — a guest session is TTL'd anyway) before being asked
   *  to register. Enforced server-side (lib/generation/plan.ts caps the
   *  Free plan for guests); the sign-up prompt in ToolRunner is only the
   *  explanation. */
  guestGenerationLimit: positiveIntFromEnv(process.env.GUEST_GENERATION_LIMIT, 3),
  /** Burst cap per user or guest session (lib/limits/rateLimit.ts,
   *  architecture doc §17) — generations started in any 60-second window.
   *  Generous for a person, low for a script. */
  maxGenerationsPerMinute: positiveIntFromEnv(process.env.MAX_GENERATIONS_PER_MINUTE, 6),
  /** Cap on AI response length (billed per token actually produced, so
   *  this is a ceiling, not a cost). Raised from 2048 in Phase 1: current
   *  Claude models think adaptively by default and thinking tokens count
   *  toward this same budget, so 2048 could truncate even a short ad —
   *  8192 leaves room for thinking plus the longest content template
   *  (blog/SEO drafts) while still bounding a runaway or adversarial
   *  prompt. */
  maxOutputTokens: 8192,
};
