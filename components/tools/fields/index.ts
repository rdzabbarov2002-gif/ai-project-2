import type { ComponentType } from "react";
import { TextField } from "./TextField";
import { TextareaField } from "./TextareaField";
import { NumberField } from "./NumberField";
import { EmailField } from "./EmailField";
import { SelectField } from "./SelectField";
import { RadioField } from "./RadioField";
import { CheckboxField } from "./CheckboxField";
import type { FieldConfig } from "@/lib/tool-config/schema";
import type { FieldComponentProps } from "./types";

/**
 * The registry. This is the entire mechanism behind "add a field type
 * without touching ToolRunner" — a new type is a new component file plus
 * one line here. FieldRenderer.tsx is the only consumer.
 *
 * `any` here (not on the individual field components, which each keep
 * their own precise `FieldComponentProps<TextFieldConfig>` etc. typing)
 * is the standard, contained cost of a heterogeneous "component per union
 * variant" registry: TypeScript can't prove, through a keyed lookup, that
 * the component pulled out for a given `field.type` matches that
 * specific field's shape — only that some `FieldComponentProps` consumer
 * does. FieldRenderer.tsx's cast at the call site is the one place that
 * assumption lives.
 */
export const FIELD_COMPONENTS: Record<FieldConfig["type"], ComponentType<FieldComponentProps<any>>> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  email: EmailField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
};
