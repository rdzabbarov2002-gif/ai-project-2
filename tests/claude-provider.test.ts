import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const clientOptions: unknown[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class APIConnectionError extends APIError {}
  class APIConnectionTimeoutError extends APIConnectionError {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static RateLimitError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static InternalServerError = class extends APIError {};
    static APIConnectionError = APIConnectionError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    messages = { create };
    constructor(options: unknown) {
      clientOptions.push(options);
    }
  }
  return { default: Anthropic };
});

const { ClaudeProvider } = await import("@/lib/ai-provider/claude");
const Anthropic = (await import("@anthropic-ai/sdk")).default as unknown as Record<string, new (m: string) => Error>;

const params = { systemPrompt: "sys", userPrompt: "user", model: "claude-sonnet-5", maxTokens: 8192, temperature: 0.7 };

describe("ClaudeProvider", () => {
  beforeEach(() => {
    create.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("never sends sampling parameters (claude-sonnet-5 rejects them with a 400)", async () => {
    create.mockResolvedValue({
      content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Hello" }],
      usage: { input_tokens: 3, output_tokens: 1 },
      model: "claude-sonnet-5",
      stop_reason: "end_turn",
    });
    const result = await new ClaudeProvider().generate(params);
    expect(result).toEqual({ text: "Hello", usage: { inputTokens: 3, outputTokens: 1 }, provider: "claude", model: "claude-sonnet-5" });
    const body = create.mock.calls[0]![0];
    expect(body).toEqual({ model: "claude-sonnet-5", max_tokens: 8192, system: "sys", messages: [{ role: "user", content: "user" }] });
    expect(body).not.toHaveProperty("temperature");
  });

  it("treats an answer with no visible text (e.g. a refusal) as an error, not an empty result", async () => {
    create.mockResolvedValue({ content: [], usage: { input_tokens: 1, output_tokens: 0 }, model: "m", stop_reason: "refusal" });
    await expect(new ClaudeProvider().generate(params)).rejects.toMatchObject({ kind: "unknown", provider: "claude" });
  });

  it("retries a transient failure once, but not a rate limit", async () => {
    create.mockRejectedValueOnce(new Anthropic.InternalServerError!("overloaded")).mockResolvedValueOnce({
      content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 }, model: "m", stop_reason: "end_turn",
    });
    await expect(new ClaudeProvider().generate(params)).resolves.toMatchObject({ text: "ok" });
    expect(create).toHaveBeenCalledTimes(2);

    create.mockReset();
    create.mockRejectedValue(new Anthropic.RateLimitError!("slow down"));
    await expect(new ClaudeProvider().generate(params)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps both attempts inside one time budget, with no SDK retries on top", async () => {
    create.mockRejectedValueOnce(new Anthropic.InternalServerError!("overloaded")).mockResolvedValueOnce({
      content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 }, model: "m", stop_reason: "end_turn",
    });
    await new ClaudeProvider().generate({ ...params, timeoutMs: 10_000 });

    expect(clientOptions.at(-1)).toMatchObject({ maxRetries: 0 });
    const [first, second] = create.mock.calls.map((call) => call[1].timeout as number);
    expect(first).toBeLessThanOrEqual(10_000);
    // The retry gets what's left after the first attempt and the back-off.
    expect(second).toBeLessThanOrEqual(10_000 - 500);
  });

  it("doesn't retry once the budget is spent", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError!("timed out"));
    await expect(new ClaudeProvider().generate({ ...params, timeoutMs: 300 })).rejects.toMatchObject({ kind: "timeout" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reports a missing API key as a configuration error", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(new ClaudeProvider().generate(params)).rejects.toMatchObject({ kind: "configuration" });
  });
});
