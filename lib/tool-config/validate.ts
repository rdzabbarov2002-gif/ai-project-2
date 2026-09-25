import { ToolConfigSchemaSchema, type ToolConfigSchema } from "./schema";

const EMPTY_SCHEMA: ToolConfigSchema = { fields: [] };

/**
 * `tools.config_schema` is jsonb — Postgres guarantees it's valid JSON,
 * nothing about its shape. A malformed row (hand-edited in the SQL
 * editor, or written by a future admin tool with a bug) must never crash
 * the tool's page; it degrades to an empty form instead, same spirit as
 * lib/generation/plan.ts failing closed rather than open. The tool is
 * still usable (Stage 5's pipeline builds a generic prompt with no
 * template fields either way), just without configurable inputs until
 * the row is fixed.
 */
export function parseToolConfigSchema(raw: unknown): ToolConfigSchema {
  const result = ToolConfigSchemaSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      "[tool-config] invalid config_schema, falling back to an empty form:",
      result.error.message,
    );
    return EMPTY_SCHEMA;
  }
  return result.data;
}
