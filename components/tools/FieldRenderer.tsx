"use client";

import { FIELD_COMPONENTS } from "./fields";
import type { FieldComponentProps } from "./fields/types";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * ToolRunner's only dependency on "what field types exist" — it renders
 * whatever `schema.fields` contains by looking each one up in the
 * registry. Nothing here knows about `text` vs `select` vs any other
 * specific type; that knowledge lives entirely in fields/index.ts.
 *
 * An unrecognized `field.type` (a newer config_schema running against an
 * older deployed frontend, or a typo written by hand in the SQL editor)
 * degrades to an inline message instead of crashing the whole form — the
 * same "fail one field, not the page" instinct as
 * lib/tool-config/validate.ts failing an entire malformed schema down to
 * an empty one.
 */
export function FieldRenderer({ field, value, onChange, error }: FieldComponentProps) {
  const t = useMessages();
  const Component = FIELD_COMPONENTS[field.type];

  if (!Component) {
    return (
      <p className="text-sm text-danger">{t.runner.unsupportedField(field.type, field.label)}</p>
    );
  }

  return <Component field={field} value={value} onChange={onChange} error={error} />;
}
