import { beforeEach, describe, expect, it, vi } from "vitest";

const runGeneration = vi.fn();
vi.mock("@/lib/generation/pipeline", () => ({ runGeneration }));

const { POST } = await import("@/app/api/generate/route");
const { AIProviderError } = await import("@/lib/ai-provider");
const { GenerationError } = await import("@/lib/generation/errors");

function post(body: string) {
  return POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

const validBody = JSON.stringify({ toolSlug: "ad-generator", guestSessionToken: "guest-token-123" });

/**
 * What a person sees when generation fails: a status and a plain message,
 * never the provider's error text or a stack trace.
 */
describe("POST /api/generate errors", () => {
  beforeEach(() => {
    runGeneration.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each([
    ["rate_limited", 503, "The AI provider is busy right now. Please try again shortly."],
    ["overloaded", 503, "The AI provider is temporarily unavailable. Please try again shortly."],
    ["network", 503, "Couldn't reach the AI provider. Please try again shortly."],
    ["timeout", 504, "The request took too long. Please try again."],
    ["authentication", 500, "Something went wrong generating your content. Please try again."],
    ["unknown", 500, "Something went wrong generating your content. Please try again."],
  ] as const)("provider %s → %i with a plain message", async (kind, status, message) => {
    runGeneration.mockRejectedValue(
      new AIProviderError("claude", kind, "529 {\"type\":\"overloaded_error\"} sk-ant-secret"),
    );
    const res = await post(validBody);
    const body = await res.json();
    expect(res.status).toBe(status);
    expect(body).toEqual({ error: { code: "ai_provider_error", message } });
    expect(JSON.stringify(body)).not.toMatch(/sk-ant|overloaded_error|529/);
  });

  it("passes a limit rejection through unchanged", async () => {
    runGeneration.mockRejectedValue(
      new GenerationError("usage_limit_reached", 429, "You've used all your generations for this month."),
    );
    const res = await post(validBody);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: { code: "usage_limit_reached", message: "You've used all your generations for this month." },
    });
  });

  it("answers an unexpected bug with a generic 500, no stack", async () => {
    runGeneration.mockRejectedValue(new TypeError("Cannot read properties of undefined (reading 'id')"));
    const res = await post(validBody);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toMatch(/TypeError|reading|at /);
  });

  it("refuses a body that isn't JSON before doing any work", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect(runGeneration).not.toHaveBeenCalled();
  });
});
