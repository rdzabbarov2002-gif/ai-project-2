import type { ReactNode } from "react";

/**
 * Label + help text + error, identical across every field type. Each
 * field component owns only its actual input element; this is the one
 * place that owns the surrounding label/error chrome, so seven field
 * components don't each re-implement (and potentially drift on) the same
 * three lines of markup.
 */
export function FieldWrapper({
  label,
  required,
  helpText,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  /** The id of the input inside — ties the visible label to it for
   *  screen readers and click-to-focus (Stage 14 accessibility pass). */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helpText ? (
        <p className="text-xs text-ink-600">{helpText}</p>
      ) : null}
    </div>
  );
}
