import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "@/lib/analytics";

describe("track", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does nothing without a PostHog key", async () => {
    vi.stubEnv("POSTHOG_KEY", "");
    await track("signed_up", "user-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one event to the capture API", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    vi.stubEnv("POSTHOG_HOST", "https://eu.i.posthog.com");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await track("generation_completed", "user-1", { tool: "ad-generator" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://eu.i.posthog.com/i/v0/e/");
    expect(JSON.parse(init.body)).toEqual({
      api_key: "phc_test",
      event: "generation_completed",
      distinct_id: "user-1",
      properties: { tool: "ad-generator", distinct_id: "user-1" },
    });
  });

  it("never throws when PostHog can't be reached", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(track("signed_up", "user-1")).resolves.toBeUndefined();
  });
});
