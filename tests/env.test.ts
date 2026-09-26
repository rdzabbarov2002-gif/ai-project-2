import { describe, expect, it } from "vitest";
import { assertEnv, checkEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
  ANTHROPIC_API_KEY: "sk-ant-secret",
};

describe("checkEnv", () => {
  it("accepts the four required variables alone", () => {
    expect(checkEnv(valid)).toEqual([]);
  });

  it("accepts every optional variable when well-formed", () => {
    expect(
      checkEnv({
        ...valid,
        NEXT_PUBLIC_SITE_URL: "https://app.example.com",
        DEFAULT_AI_PROVIDER: "claude",
        DEFAULT_AI_MODEL: "claude-sonnet-5",
        GUEST_GENERATION_LIMIT: "3",
        MAX_GENERATIONS_PER_MINUTE: "6",
      }),
    ).toEqual([]);
  });

  it("names every missing required variable", () => {
    expect(checkEnv({})).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL: is required",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY: is required",
      "SUPABASE_SERVICE_ROLE_KEY: is required",
      "ANTHROPIC_API_KEY: is required",
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
    const env = { ...valid, ANTHROPIC_API_KEY: "", NEXT_PUBLIC_SUPABASE_URL: "not a url" };
    let message = "";
    try {
      assertEnv(env);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("ANTHROPIC_API_KEY: is required");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL: must be a full URL");
    expect(message).not.toContain("not a url");
    expect(message).not.toContain("service-role-secret");
  });
});
