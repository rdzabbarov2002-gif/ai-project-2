"use client";

import { Input } from "@/components/ui/Input";
import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { NumberFieldConfig } from "@/lib/tool-config/schema";

export function NumberField({ field, value, onChange, error }: FieldComponentProps<NumberFieldConfig>) {
  return (
    <FieldWrapper label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <Input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
        required={field.required}
      />
    </FieldWrapper>
  );
}
