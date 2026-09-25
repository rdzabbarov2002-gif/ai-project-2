import type { FieldConfig } from "@/lib/tool-config/schema";

/**
 * The one prop contract every field component implements — this is what
 * makes the registry in ./index.ts possible. A new field type only needs
 * to satisfy this shape to slot in; ToolRunner and FieldRenderer never
 * grow a case for it.
 */
export interface FieldComponentProps<TField extends FieldConfig = FieldConfig> {
  field: TField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}
