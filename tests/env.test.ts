import { describe, expect, it } from "vitest";
import { assertEnv, checkEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
};

describe("checkEnv", () => {
  it("accepts the three required variables alone", () => {
    expect(checkEnv(valid)).toEqual([]);
  });

  it("accepts every optional variable when well-formed", () => {
    expect(
      checkEnv({
        ...valid,
        NEXT_PUBLIC_SITE_URL: "https://app.example.com",
        OPENAI_API_KEY: "sk-proj-secret",
        ANTHROPIC_API_KEY: "sk-ant-secret",
        DEFAULT_AI_PROVIDER: "claude",
        DEFAULT_AI_MODEL: "claude-sonnet-5",
        GUEST_GENERATION_LIMIT: "3",
        MAX_GENERATIONS_PER_MINUTE: "6",
        GUEST_GENERATIONS_PER_IP_PER_DAY: "20",
      }),
    ).toEqual([]);
  });

  it("wants the webhook secret whenever payments are on", () => {
    expect(checkEnv({ ...valid, STRIPE_SECRET_KEY: "sk_test_x" })).toEqual([
      "STRIPE_WEBHOOK_SECRET: is required when STRIPE_SECRET_KEY is set",
    ]);
    expect(checkEnv({ ...valid, STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" })).toEqual([]);
  });

  it("wants a support address, who runs the service, its address and the cron secret in production only", () => {
    expect(checkEnv({ ...valid, VERCEL_ENV: "production" })).toEqual([
      "NEXT_PUBLIC_SUPPORT_EMAIL: is required in production",
      "LEGAL_OPERATOR: is required in production",
      "LEGAL_COUNTRY: is required in production",
      "EMAIL_PROVIDER: is required in production",
      "NEXT_PUBLIC_SITE_URL: is required in production",
      "CRON_SECRET: is required in production",
      "OPENAI_API_KEY: is required in production",
    ]);
    const launched = {
      ...valid,
      VERCEL_ENV: "production",
      OPENAI_API_KEY: "sk-proj-secret",
      NEXT_PUBLIC_SUPPORT_EMAIL: "help@app.example",
      LEGAL_OPERATOR: "Example Ltd, 1 Main St, Dublin",
      LEGAL_COUNTRY: "Ireland",
      EMAIL_PROVIDER: "Resend",
      NEXT_PUBLIC_SITE_URL: "https://app.example",
      CRON_SECRET: "cron-secret",
    };
    expect(checkEnv(launched)).toEqual([]);
    expect(checkEnv({ ...valid, VERCEL_ENV: "preview" })).toEqual([]);
    expect(checkEnv({ ...valid, NEXT_PUBLIC_SUPPORT_EMAIL: "not-an-email" })).toEqual([
      "NEXT_PUBLIC_SUPPORT_EMAIL: must be an email address",
    ]);
  });

  it("wants the key of the provider that generates in production, and only there", () => {
    const launched = {
      ...valid,
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SUPPORT_EMAIL: "help@app.example",
      LEGAL_OPERATOR: "Example Ltd, 1 Main St, Dublin",
      LEGAL_COUNTRY: "Ireland",
      EMAIL_PROVIDER: "Resend",
      NEXT_PUBLIC_SITE_URL: "https://app.example",
      CRON_SECRET: "cron-secret",
    };
    // OpenAI unless DEFAULT_AI_PROVIDER says otherwise.
    expect(checkEnv(launched)).toEqual(["OPENAI_API_KEY: is required in production"]);
    expect(checkEnv({ ...launched, OPENAI_API_KEY: "sk-proj-secret" })).toEqual([]);
    expect(checkEnv({ ...launched, DEFAULT_AI_PROVIDER: "claude", OPENAI_API_KEY: "sk-proj-secret" })).toEqual([
      "ANTHROPIC_API_KEY: is required in production",
    ]);
    expect(checkEnv({ ...launched, DEFAULT_AI_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-ant-secret" })).toEqual([]);
    // A preview runs without one: pages work, a generation reports the key missing.
    expect(checkEnv({ ...valid, VERCEL_ENV: "preview" })).toEqual([]);
  });

  it("names every missing required variable", () => {
    expect(checkEnv({})).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL: is required",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY: is required",
      "SUPABASE_SERVICE_ROLE_KEY: is required",
    ]);
  });

  it("treats a blank value as unset (.env.example copied as-is)", () => {
    expect(checkEnv({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "" })).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY: is required",
    ]);
    expect(
      checkEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "", GUEST_GENERATION_LIMIT: "" }),
    ).toEqual([]);
  });

  it("rejects malformed values with the reason", () => {
    const problems = checkEnv({
      ...valid,
      NEXT_PUBLIC_SUPABASE_URL: "abc.supabase.co",
      DEFAULT_AI_PROVIDER: "gpt",
      GUEST_GENERATION_LIMIT: "0",
      MAX_GENERATIONS_PER_MINUTE: "six",
    });
    expect(problems).toHaveLength(4);
    expect(problems[0]).toMatch(/^NEXT_PUBLIC_SUPABASE_URL: must be a full URL/);
    expect(problems[1]).toMatch(/^DEFAULT_AI_PROVIDER: /);
    expect(problems[2]).toBe("GUEST_GENERATION_LIMIT: must be a positive whole number");
    expect(problems[3]).toBe("MAX_GENERATIONS_PER_MINUTE: must be a positive whole number");
  });
});

describe("assertEnv", () => {
  it("passes silently on a valid environment", () => {
    expect(() => assertEnv(valid)).not.toThrow();
  });

  it("throws one error that names the variables but never prints values", () => {
    const env = { ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_SUPABASE_URL: "not a url" };
    let message = "";
    try {
      assertEnv(env);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY: is required");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL: must be a full URL");
    expect(message).not.toContain("not a url");
    expect(message).not.toContain("service-role-secret");
  });
});
