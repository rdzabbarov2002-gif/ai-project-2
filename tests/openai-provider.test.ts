import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const clientOptions: unknown[] = [];
vi.mock("openai", () => {
  class APIError extends Error {
    constructor(
      message: string,
      readonly code: string | null = null,
    ) {
      super(message);
    }
  }
  class APIConnectionError extends APIError {}
  class APIConnectionTimeoutError extends APIConnectionError {}
  class OpenAI {
    static AuthenticationError = class extends APIError {};
    static PermissionDeniedError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    static RateLimitError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static UnprocessableEntityError = class extends APIError {};
    static InternalServerError = class extends APIError {};
    static APIConnectionError = APIConnectionError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    responses = { create };
    constructor(options: unknown) {
      clientOptions.push(options);
    }
  }
  return { default: OpenAI };
});

const { OpenaiProvider } = await import("@/lib/ai-provider/openai");
const OpenAI = (await import("openai")).default as unknown as Record<string, new (m: string, code?: string) => Error>;

const params = { systemPrompt: "sys", userPrompt: "user", model: "gpt-6.1-terra", maxTokens: 8192, temperature: 0.7 };
const answer = (text: string) => ({
  output_text: text,
  status: "completed",
  incomplete_details: null,
  usage: { input_tokens: 3, output_tokens: 1 },
  model: "gpt-6.1-terra-2026-10-26",
});

describe("OpenaiProvider", () => {
  beforeEach(() => {
    create.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("sends the prompts to the Responses API, with low reasoning and nothing stored", async () => {
    create.mockResolvedValue(answer("Hello"));
    const result = await new OpenaiProvider().generate(params);
    expect(result).toEqual({
      text: "Hello",
      usage: { inputTokens: 3, outputTokens: 1 },
      provider: "openai",
      model: "gpt-6.1-terra-2026-10-26",
    });
    const body = create.mock.calls[0]![0];
    expect(body).toEqual({
      model: "gpt-6.1-terra",
      instructions: "sys",
      input: "user",
      max_output_tokens: 8192,
      reasoning: { effort: "low" },
      store: false,
    });
    // Current GPT models reject sampling parameters while they reason.
    expect(body).not.toHaveProperty("temperature");
  });

  it("treats an answer with no text (a refusal, the budget spent on reasoning) as an error", async () => {
    create.mockResolvedValue({ ...answer(""), status: "incomplete", incomplete_details: { reason: "max_output_tokens" } });
    await expect(new OpenaiProvider().generate(params)).rejects.toMatchObject({
      kind: "unknown",
      provider: "openai",
      message: expect.stringContaining("incomplete, max_output_tokens"),
    });
  });

  it("retries a transient failure once, but not a rate limit", async () => {
    create.mockRejectedValueOnce(new OpenAI.InternalServerError!("server error")).mockResolvedValueOnce(answer("ok"));
    await expect(new OpenaiProvider().generate(params)).resolves.toMatchObject({ text: "ok" });
    expect(create).toHaveBeenCalledTimes(2);

    create.mockReset();
    create.mockRejectedValue(new OpenAI.RateLimitError!("slow down", "rate_limit_exceeded"));
    await expect(new OpenaiProvider().generate(params)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reports an account out of credit as our configuration, not a rate limit", async () => {
    create.mockRejectedValue(new OpenAI.RateLimitError!("You exceeded your current quota", "insufficient_quota"));
    await expect(new OpenaiProvider().generate(params)).rejects.toMatchObject({ kind: "configuration", retryable: false });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reports a model the key can't use as an invalid request", async () => {
    create.mockRejectedValue(new OpenAI.NotFoundError!("The model does not exist or you do not have access to it."));
    await expect(new OpenaiProvider().generate(params)).rejects.toMatchObject({ kind: "invalid_request" });
  });

  it("keeps both attempts inside one time budget, with no SDK retries on top", async () => {
    create.mockRejectedValueOnce(new OpenAI.APIConnectionError!("socket hang up")).mockResolvedValueOnce(answer("ok"));
    await new OpenaiProvider().generate({ ...params, timeoutMs: 10_000 });

    expect(clientOptions.at(-1)).toMatchObject({ maxRetries: 0 });
    const [first, second] = create.mock.calls.map((call) => call[1].timeout as number);
    expect(first).toBeLessThanOrEqual(10_000);
    // The retry gets what's left after the first attempt and the back-off.
    expect(second).toBeLessThanOrEqual(10_000 - 500);
  });

  it("doesn't retry once the budget is spent", async () => {
    create.mockRejectedValue(new OpenAI.APIConnectionTimeoutError!("timed out"));
    await expect(new OpenaiProvider().generate({ ...params, timeoutMs: 300 })).rejects.toMatchObject({ kind: "timeout" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reports a missing API key as a configuration error", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(new OpenaiProvider().generate(params)).rejects.toMatchObject({ kind: "configuration" });
    expect(create).not.toHaveBeenCalled();
  });
});
