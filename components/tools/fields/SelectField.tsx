"use client";

import { Select } from "@/components/ui/Select";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { SelectFieldConfig } from "@/lib/tool-config/schema";

export function SelectField({ field, value, onChange, error }: FieldComponentProps<SelectFieldConfig>) {
  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      helpText={field.helpText}
      error={error}
      htmlFor={`field-${field.name}`}
    >
      <Select
        id={`field-${field.name}`}
        aria-invalid={error ? true : undefined}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      >
        <option value="" disabled>
          {field.placeholder ?? "Select…"}
        </option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FieldWrapper>
  );
}
