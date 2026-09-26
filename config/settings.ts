/**
 * Central application settings sourced from env vars, so nothing else in
 * the codebase reads `process.env` directly (keeps Stage 1's "config not
 * code" principle consistent for non-JSON settings too).
 */
export const appSettings = {
  defaultAIProvider: process.env.DEFAULT_AI_PROVIDER ?? "claude",
  defaultAIModel: process.env.DEFAULT_AI_MODEL ?? "claude-sonnet-5",
  guestSessionTtlDays: 30,
  /** Cap on AI response length (billed per token actually produced, so
   *  this is a ceiling, not a cost). Raised from 2048 in Phase 1: current
   *  Claude models think adaptively by default and thinking tokens count
   *  toward this same budget, so 2048 could truncate even a short ad —
   *  8192 leaves room for thinking plus the longest content template
   *  (blog/SEO drafts) while still bounding a runaway or adversarial
   *  prompt. */
  maxOutputTokens: 8192,
};
