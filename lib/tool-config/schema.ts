import { z } from "zod";

/**
 * The field-config format every tool's `tools.config_schema` (jsonb) is
 * expected to follow, and the single source of truth ToolRunner renders
 * against. This is Stage 6's actual deliverable as much as the React
 * components are: Postgres doesn't validate the *shape* of a jsonb
 * column, only that it's valid JSON, so this schema is what turns
 * "config, not code" (project architecture doc §14) from an aspiration
 * into something a malformed row can't silently break.
 *
 * Adding a new field type later means: one new branch here, one new
 * component in components/tools/fields/, one new registry line in
 * components/tools/fields/index.ts. Nothing else in ToolRunner,
 * FieldRenderer, or any existing field component changes.
 */

const baseField = {
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  helpText: z.string().max(500).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().optional(),
};

export const TextFieldSchema = z.object({
  ...baseField,
  type: z.literal("text"),
  defaultValue: z.string().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().optional(),
});

export const TextareaFieldSchema = z.object({
  ...baseField,
  type: z.literal("textarea"),
  defaultValue: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  rows: z.number().int().positive().max(20).optional(),
});

export const NumberFieldSchema = z.object({
  ...baseField,
  type: z.literal("number"),
  defaultValue: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
});

export const EmailFieldSchema = z.object({
  ...baseField,
  type: z.literal("email"),
  defaultValue: z.string().optional(),
});

const optionSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

export const SelectFieldSchema = z.object({
  ...baseField,
  type: z.literal("select"),
  defaultValue: z.string().optional(),
  options: z.array(optionSchema).min(1),
});

export const RadioFieldSchema = z.object({
  ...baseField,
  type: z.literal("radio"),
  defaultValue: z.string().optional(),
  options: z.array(optionSchema).min(1),
});

export const CheckboxFieldSchema = z.object({
  ...baseField,
  type: z.literal("checkbox"),
  defaultValue: z.boolean().optional(),
});

export const FieldConfigSchema = z.discriminatedUnion("type", [
  TextFieldSchema,
  TextareaFieldSchema,
  NumberFieldSchema,
  EmailFieldSchema,
  SelectFieldSchema,
  RadioFieldSchema,
  CheckboxFieldSchema,
]);

export const ToolConfigSchemaSchema = z.object({
  fields: z.array(FieldConfigSchema).default([]),
});

export type TextFieldConfig = z.infer<typeof TextFieldSchema>;
export type TextareaFieldConfig = z.infer<typeof TextareaFieldSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldSchema>;
export type EmailFieldConfig = z.infer<typeof EmailFieldSchema>;
export type SelectFieldConfig = z.infer<typeof SelectFieldSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldSchema>;
export type FieldConfig = z.infer<typeof FieldConfigSchema>;
export type ToolConfigSchema = z.infer<typeof ToolConfigSchemaSchema>;
