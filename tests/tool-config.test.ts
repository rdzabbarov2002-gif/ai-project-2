import { describe, expect, it, vi } from "vitest";
import { parseToolConfigSchema } from "@/lib/tool-config/validate";
import { buildInitialValues } from "@/lib/tool-config/initialValues";
import { findMissingRequiredFields } from "@/lib/tool-config/validateValues";

const schema = parseToolConfigSchema({
  fields: [
    { type: "text", name: "topic", label: "Topic", required: true },
    { type: "select", name: "length", label: "Length", required: true, defaultValue: "Medium", options: [{ label: "Medium", value: "Medium" }] },
    { type: "checkbox", name: "agree", label: "Agree", required: true },
    { type: "number", name: "count", label: "Count", required: true },
  ],
});

describe("parseToolConfigSchema", () => {
  it("parses a valid schema", () => {
    expect(schema.fields.map((f) => f.type)).toEqual(["text", "select", "checkbox", "number"]);
  });

  it("degrades a malformed schema to an empty form instead of throwing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseToolConfigSchema({ fields: [{ type: "select", name: "x", label: "X", options: [] }] })).toEqual({ fields: [] });
    expect(parseToolConfigSchema("not json")).toEqual({ fields: [] });
  });
});

describe("form values", () => {
  it("seeds defaults and unchecked checkboxes", () => {
    expect(buildInitialValues(schema)).toEqual({ length: "Medium", agree: false });
  });

  it("reports every required field that is still empty", () => {
    expect(findMissingRequiredFields(schema, buildInitialValues(schema))).toEqual(["topic", "agree", "count"]);
    expect(
      findMissingRequiredFields(schema, { topic: "x", length: "Medium", agree: true, count: Number.NaN }),
    ).toEqual(["count"]);
    expect(findMissingRequiredFields(schema, { topic: "x", length: "Medium", agree: true, count: 0 })).toEqual([]);
  });
});
