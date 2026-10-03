"use client";

import { FieldWrapper } from "./FieldWrapper";
import type { FieldComponentProps } from "./types";
import type { RadioFieldConfig } from "@/lib/tool-config/schema";

/**
 * No components/ui/Radio primitive: unlike Textarea/Select/Checkbox (all
 * genuinely generic atoms), a radio input only ever makes sense paired
 * with its option label and grouped by `name` — that pairing is specific
 * to this field's rendering, not a reusable atom on its own. Kept local
 * rather than added to the shared UI kit for something only this one
 * caller uses.
 */
export function RadioField({ field, value, onChange, error }: FieldComponentProps<RadioFieldConfig>) {
  return (
    <FieldWrapper label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <div role="radiogroup" aria-label={field.label} className="space-y-1.5">
        {field.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-ink-950">
            <input
              type="radio"
              name={field.name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              required={field.required}
              className="accent-accent"
            />
            {option.label}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}
