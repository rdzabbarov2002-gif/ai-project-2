"use client";

import { useState, type FormEvent } from "react";
import { useGuestSession } from "@/lib/guest-session/context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldRenderer } from "./FieldRenderer";
import { buildInitialValues } from "@/lib/tool-config/initialValues";
import { findMissingRequiredFields } from "@/lib/tool-config/validateValues";
import type { ToolConfigSchema } from "@/lib/tool-config/schema";

export interface ToolRunnerProps {
  tool: { slug: string; name: string };
  /** Optional today (no Templates Library UI yet — Stage 10); the prop
   *  exists now purely because Stage 5's /api/generate already accepts
   *  it, so a future template picker only has to pass this down, not
   *  change ToolRunner. */
  templateSlug?: string;
  schema: ToolConfigSchema;
}

/**
 * Response shapes mirrored from Stage 5's contract
 * (lib/generation/pipeline.ts GenerateResult / app/api/generate/route.ts
 * error shape) rather than imported directly: that module chain is
 * marked `server-only` end to end (pipeline.ts → ai-provider, supabase
 * admin, etc.), so importing its types here would be importing from a
 * module Next.js would refuse to bundle for the client. Duplicating just
 * the response *shape* — not any logic — is the correct boundary, not a
 * shortcut; if the two drift, that's a contract break worth a compiler
 * error on whichever side changes.
 */
interface GenerateSuccess {
  id: string | null;
  saved: boolean;
  output: string;
  provider: string;
  model: string;
  remaining: number | "unlimited";
}
interface GenerateError {
  error: { code: string; message: string };
}

export function ToolRunner({ tool, templateSlug, schema }: ToolRunnerProps) {
  const { ensureSession } = useGuestSession();
  const [values, setValues] = useState<Record<string, unknown>>(() => buildInitialValues(schema));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const missing = findMissingRequiredFields(schema, values);
    if (missing.length > 0) {
      setFieldErrors(Object.fromEntries(missing.map((name) => [name, "This field is required."])));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // guestSessionToken is always sent, regardless of whether the
        // caller turns out to be signed in — Stage 5's identity resolution
        // checks the auth cookie first and simply ignores this token for a
        // signed-in request, so ToolRunner never needs to know or care
        // which case it's in. The guest session itself is created here,
        // at the first generation, not on page load (see
        // lib/guest-session/context.tsx).
        body: JSON.stringify({
          toolSlug: tool.slug,
          templateSlug,
          inputParams: values,
          guestSessionToken: ensureSession().sessionToken,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        const errorBody = body as GenerateError;
        setSubmitError(errorBody.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(body as GenerateSuccess);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
    } catch {
      // Clipboard API unavailable (non-HTTPS origin, denied permission,
      // older mobile browsers) — previously an unhandled rejection. The
      // text stays selectable for a manual copy.
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {schema.fields.length === 0 ? (
          <p className="text-sm text-ink-600">This tool has no configurable inputs — just generate.</p>
        ) : (
          schema.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) => setValue(field.name, value)}
              error={fieldErrors[field.name]}
            />
          ))
        )}

        {submitError && <p className="text-sm text-danger">{submitError}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Generating…" : `Generate with ${tool.name}`}
        </Button>
      </form>

      {result && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink-950">Result</h2>
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink-950">{result.output}</p>
          {!result.saved && (
            <p className="text-xs text-upgrade">
              This result wasn&apos;t saved to your history — copy it now if you want to keep it.
            </p>
          )}
          {result.remaining !== "unlimited" && (
            <p className="text-xs text-ink-600">{result.remaining} generations left this period.</p>
          )}
        </Card>
      )}
    </div>
  );
}
