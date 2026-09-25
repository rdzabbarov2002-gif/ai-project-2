/**
 * Central application settings sourced from env vars, so nothing else in
 * the codebase reads `process.env` directly (keeps Stage 1's "config not
 * code" principle consistent for non-JSON settings too).
 */
export const appSettings = {
  defaultAIProvider: process.env.DEFAULT_AI_PROVIDER ?? "claude",
  defaultAIModel: process.env.DEFAULT_AI_MODEL ?? "claude-sonnet-5",
  guestSessionTtlDays: 30,
  /** Cap on AI response length. Generous enough for any Stage 8-10 tool's
   *  output (ad copy, emails, social posts) without risking runaway cost
   *  on a malformed or adversarial prompt. */
  maxOutputTokens: 2048,
};
