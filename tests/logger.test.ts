import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => {
  const scope = { setTag: vi.fn(), setExtras: vi.fn() };
  return {
    scope,
    withScope: vi.fn((callback: (s: typeof scope) => void) => callback(scope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };
});
vi.mock("@sentry/nextjs", () => sentry);

import { logger } from "@/lib/logger";

function lastLine(spy: ReturnType<typeof vi.spyOn>) {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(String(call?.[0]));
}

describe("logger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("writes one JSON line per entry, with level, event, time and fields", () => {
    logger.info("cache: warmed", { entries: 3 });
    const entry = lastLine(logSpy);
    expect(entry).toMatchObject({ level: "info", event: "cache: warmed", entries: 3 });
    expect(new Date(entry.time).toString()).not.toBe("Invalid Date");

    logger.warn("slow query", { ms: 900 });
    expect(lastLine(warnSpy)).toMatchObject({ level: "warn", event: "slow query", ms: 900 });
  });

  it("does not report info or warn to Sentry", () => {
    logger.info("a");
    logger.warn("b");
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("serializes an Error and reports it to Sentry with the event as a tag", () => {
    const error = new Error("boom");
    logger.error("api/generate: unhandled error", { error, route: "/api/generate" });

    const entry = lastLine(errorSpy);
    expect(entry).toMatchObject({
      level: "error",
      event: "api/generate: unhandled error",
      route: "/api/generate",
      error: { name: "Error", message: "boom" },
    });
    expect(entry.error.stack).toContain("boom");

    expect(sentry.captureException).toHaveBeenCalledWith(error);
    expect(sentry.scope.setTag).toHaveBeenCalledWith("event", "api/generate: unhandled error");
    expect(sentry.scope.setExtras).toHaveBeenCalledWith({ route: "/api/generate" });
  });

  it("keeps a PostgREST error's code and reports it as a message", () => {
    logger.error("profile: save failed", {
      error: { message: "duplicate key", code: "23505", details: "Key exists", hint: null },
    });

    expect(lastLine(errorSpy).error).toEqual({
      message: "duplicate key",
      code: "23505",
      details: "Key exists",
    });
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      "profile: save failed: duplicate key",
      "error",
    );
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports an error entry without an error value by its event name", () => {
    logger.error("tool-config: invalid config_schema");
    expect(lastLine(errorSpy)).not.toHaveProperty("error");
    expect(sentry.captureMessage).toHaveBeenCalledWith("tool-config: invalid config_schema", "error");
  });
});
