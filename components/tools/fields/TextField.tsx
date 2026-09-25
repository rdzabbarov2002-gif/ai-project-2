"use client";

import { Input } from "@/components/ui/Input";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { TextFieldConfig } from "@/lib/tool-config/schema";

export function TextField({ field, value, onChange, error }: FieldComponentProps<TextFieldConfig>) {
  return (
    <FieldWrapper label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <Input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        minLength={field.minLength}
        maxLength={field.maxLength}
        pattern={field.pattern}
        required={field.required}
      />
    </FieldWrapper>
  );
}
