import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/history?page=2", "/tools/ad-generator?template=x"])("keeps same-origin path %s", (path) => {
    expect(safeRedirectPath(path, "/dashboard")).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "dashboard",
    "",
    null,
    undefined,
  ])("rejects %j", (value) => {
    expect(safeRedirectPath(value, "/dashboard")).toBe("/dashboard");
  });
});
