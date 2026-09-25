import type { ToolConfigSchema } from "./schema";

/** Seeds form state from each field's `defaultValue` (or `false` for an
 *  unchecked checkbox, so it's always a controlled boolean from the start
 *  rather than `undefined`). */
export function buildInitialValues(schema: ToolConfigSchema): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue;
    } else if (field.type === "checkbox") {
      values[field.name] = false;
    }
  }

  return values;
}
