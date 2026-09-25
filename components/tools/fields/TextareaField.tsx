"use client";

import { Textarea } from "@/components/ui/Textarea";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { TextareaFieldConfig } from "@/lib/tool-config/schema";

export function TextareaField({
  field,
  value,
  onChange,
  error,
}: FieldComponentProps<TextareaFieldConfig>) {
  return (
    <FieldWrapper label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <Textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        rows={field.rows ?? 4}
        required={field.required}
      />
    </FieldWrapper>
  );
}
