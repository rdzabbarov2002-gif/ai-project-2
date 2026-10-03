"use client";

import { Input } from "@/components/ui/Input";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { EmailFieldConfig } from "@/lib/tool-config/schema";

export function EmailField({ field, value, onChange, error }: FieldComponentProps<EmailFieldConfig>) {
  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      helpText={field.helpText}
      error={error}
      htmlFor={`field-${field.name}`}
    >
      <Input
        id={`field-${field.name}`}
        aria-invalid={error ? true : undefined}
        type="email"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    </FieldWrapper>
  );
}
