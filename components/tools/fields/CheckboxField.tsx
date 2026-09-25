"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { CheckboxFieldConfig } from "@/lib/tool-config/schema";

export function CheckboxField({
  field,
  value,
  onChange,
  error,
}: FieldComponentProps<CheckboxFieldConfig>) {
  return (
    <FieldWrapper label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <Checkbox checked={value === true} onChange={(e) => onChange(e.target.checked)} />
    </FieldWrapper>
  );
}
