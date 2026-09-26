import { z } from "zod";
import { AI_PROVIDER_NAMES } from "@/lib/ai-provider/types";

/**
 * The environment contract: every variable the app reads, checked once
 * when the server starts (instrumentation.ts). A missing or malformed
 * value stops the server with the variable's name, instead of surfacing
 * later as a 500 on the first request that happens to need it — e.g. a
 * deploy without SUPABASE_SERVICE_ROLE_KEY used to look healthy until the
 * first guest tried to generate something.
 *
 * Only names and problems are ever reported, never values: most of these
 * are secrets and error output ends up in logs.
 *
 * An empty value counts as unset: `.env.example` is meant to be copied
 * as-is, and `FOO=` there means "use the default", not "invalid".
 *
 * The rest of the code keeps reading `process.env` where it did before
 * (lib/supabase/*, config/settings.ts, lib/ai-provider/*) — this module
 * guarantees those reads find valid values, it doesn't replace them.
 */

const blankAsUndefined = (value: unknown) => (value === "" ? undefined : value);

const required = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankAsUndefined, schema);
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(blankAsUndefined, schema.optional());

const url = z.string().url("must be a full URL (https://…)");
const positiveInt = z.string().regex(/^[1-9]\d*$/, "must be a positive whole number");

const envSchema = z.object({
  // Required — see .env.example for where each value comes from.
  NEXT_PUBLIC_SUPABASE_URL: required(url),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required(z.string()),
  SUPABASE_SERVICE_ROLE_KEY: required(z.string()),
  ANTHROPIC_API_KEY: required(z.string()),

  // Optional — the app has a default for each.
  NEXT_PUBLIC_SITE_URL: optional(url),
  DEFAULT_AI_PROVIDER: optional(z.enum(AI_PROVIDER_NAMES)),
  DEFAULT_AI_MODEL: optional(z.string()),
  GUEST_GENERATION_LIMIT: optional(positiveInt),
  MAX_GENERATIONS_PER_MINUTE: optional(positiveInt),
  NEXT_PUBLIC_SENTRY_DSN: optional(url),
  POSTHOG_KEY: optional(z.string()),
  POSTHOG_HOST: optional(url),
});

type EnvSource = Record<string, string | undefined>;

/** Problems with `env`, one line per variable; empty when it's valid. */
export function checkEnv(env: EnvSource): string[] {
  const result = envSchema.safeParse(env);
  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const name = issue.path.join(".");
    const missing = issue.code === "invalid_type" && issue.received === "undefined";
    return `${name}: ${missing ? "is required" : issue.message}`;
  });
}

/** Throws one error naming every missing or invalid variable. */
export function assertEnv(env: EnvSource = process.env): void {
  const problems = checkEnv(env);
  if (problems.length === 0) return;

  throw new Error(
    [
      "Invalid environment configuration — the server can't start:",
      ...problems.map((problem) => `  - ${problem}`),
      "Set these in .env.local (local development) or in the hosting provider's",
      "environment variables; .env.example documents each one.",
    ].join("\n"),
  );
}
