import type { FieldConfig, ToolConfigSchema } from "./schema";

/**
 * Client-side-only convenience, not a security boundary: it just avoids
 * spending an AI Provider Gateway call on a form that's obviously
 * incomplete. `/api/generate` (Stage 5) doesn't know or enforce per-tool
 * required fields — `inputParams` is a generic record as far as the
 * pipeline is concerned — so this has no server-side counterpart to stay
 * in sync with, and doesn't need one.
 */
export function findMissingRequiredFields(
  schema: ToolConfigSchema,
  values: Record<string, unknown>,
): string[] {
  return schema.fields
    .filter((field) => field.required && isEmptyValue(values[field.name], field.type))
    .map((field) => field.name);
}

function isEmptyValue(value: unknown, type: FieldConfig["type"]): boolean {
  if (type === "checkbox") return value !== true;
  if (typeof value === "number") return Number.isNaN(value);
  return value === undefined || value === null || value === "";
}
