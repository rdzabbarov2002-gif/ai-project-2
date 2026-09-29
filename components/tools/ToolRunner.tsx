"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useGuestSession } from "@/lib/guest-session/context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SignUpPrompt } from "@/components/auth/SignUpPrompt";
import { FieldRenderer } from "./FieldRenderer";
import { buildInitialValues } from "@/lib/tool-config/initialValues";
import { findMissingRequiredFields } from "@/lib/tool-config/validateValues";
import type { ToolConfigSchema } from "@/lib/tool-config/schema";
import { useMessages } from "@/components/providers/LocaleProvider";
import type { Messages } from "@/lib/i18n/messages";

export interface ToolRunnerProps {
  tool: { slug: string; name: string };
  /** Optional today (no Templates Library UI yet — Stage 10); the prop
   *  exists now purely because Stage 5's /api/generate already accepts
   *  it, so a future template picker only has to pass this down, not
   *  change ToolRunner. */
  templateSlug?: string;
  schema: ToolConfigSchema;
  /** Stage 11: decided server-side by the page (signed out = guest). Only
   *  changes what's *shown* — the sign-up prompts below — never what the
   *  request does; /api/generate resolves identity on its own. */
  isGuest?: boolean;
  /** The guest allowance (config/settings.ts), for the up-front hint. */
  guestGenerationLimit?: number;
  /** Stage 13: a previous generation's saved inputs ("Use these inputs
   *  again" from History). Only keys that are fields of `schema` are
   *  used — a template's form may have changed since. */
  initialValues?: Record<string, unknown>;
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

/**
 * Error codes (lib/generation/pipeline.ts) that have a next step beyond
 * "try again" — each gets a link to it under the error message. A guest
 * out of generations (`guest_limit_reached`) gets the sign-up modal
 * instead (SignUpPrompt).
 */
const ERROR_ACTIONS: Record<string, { href: string; label: keyof Messages["runner"] }> = {
  // Signed out since the page rendered (session expired) — no guest token
  // was sent, so the API has no identity to use.
  unauthorized: { href: "/login", label: "signInAgain" },
  usage_limit_reached: { href: "/settings/billing", label: "seePlansAndLimits" },
  template_not_in_plan: { href: "/settings/billing", label: "viewPlans" },
  tool_not_in_plan: { href: "/settings/billing", label: "viewPlans" },
};

export function ToolRunner({
  tool,
  templateSlug,
  schema,
  isGuest = false,
  guestGenerationLimit,
  initialValues,
}: ToolRunnerProps) {
  const t = useMessages();
  const { session, ensureSession } = useGuestSession();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...buildInitialValues(schema),
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).filter(([name]) =>
        schema.fields.some((field) => field.name === name),
      ),
    ),
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [result, setResult] = useState<GenerateSuccess | null>(null);
  const [signUpOpen, setSignUpOpen] = useState(false);

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void generate();
  }

  // Shared by the form's submit and the result's "Regenerate" (Stage 14),
  // which re-runs the same inputs.
  async function generate() {
    const missing = findMissingRequiredFields(schema, values);
    if (missing.length > 0) {
      setFieldErrors(
        Object.fromEntries(missing.map((name) => [name, t.runner.required])),
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A guest's session is created here, at their first generation,
        // not on page load (see lib/guest-session/context.tsx). A signed-in
        // caller only forwards a token that already exists — Stage 5's
        // identity resolution checks the auth cookie first and ignores it
        // anyway, and creating one for them would only leave the merge
        // listener a pointless token to clear.
        body: JSON.stringify({
          toolSlug: tool.slug,
          templateSlug,
          inputParams: values,
          guestSessionToken: isGuest
            ? ensureSession().sessionToken
            : session?.sessionToken,
        }),
      });

      // A non-JSON body (e.g. a platform timeout page) is a failed
      // request, not a network error — handled by the !ok branch below.
      const body = await response.json().catch(() => null);

      if (!response.ok || !body) {
        const error = (body as GenerateError | null)?.error;
        setSubmitError({
          code: error?.code ?? "unknown",
          message:
            error?.code === "unauthorized"
              ? t.runner.sessionExpired
              : (error?.message ?? t.common.somethingWentWrong),
        });
        if (error?.code === "guest_limit_reached") setSignUpOpen(true);
        return;
      }

      setResult(body as GenerateSuccess);
    } catch {
      setSubmitError({
        code: "network",
        message: t.runner.network,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Architecture doc §9: "form on the left, result on the right (stacked
  // on mobile)" — two columns from `lg`, one below it.
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {schema.fields.length === 0 ? (
          <p className="text-sm text-ink-600">{t.runner.noInputs}</p>
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

        {submitError && (
          <div className="space-y-1 text-sm">
            <p className="text-danger">{submitError.message}</p>
            {ERROR_ACTIONS[submitError.code] && !isGuest && (
              <Link
                href={ERROR_ACTIONS[submitError.code]!.href}
                className="text-accent hover:underline"
              >
                {t.runner[ERROR_ACTIONS[submitError.code]!.label] as string}
              </Link>
            )}
            {submitError.code === "guest_limit_reached" && (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => setSignUpOpen(true)}
              >
                {t.runner.createAccountToContinue}
              </button>
            )}
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? t.runner.generating : t.runner.generateWith(tool.name)}
        </Button>

        {isGuest && guestGenerationLimit !== undefined && (
          <p className="text-xs text-ink-600">
            {t.runner.guestHintBefore(guestGenerationLimit)}{" "}
            <Link href="/register" className="text-accent underline">
              {t.runner.guestHintLink}
            </Link>{" "}
            {t.runner.guestHintAfter}
          </p>
        )}
      </form>

      <SignUpPrompt
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        title={t.runner.limitTitle}
        message={t.runner.limitMessage}
      />

      <section
        aria-label={t.runner.resultLabel}
        aria-live="polite"
        aria-busy={submitting}
        className="lg:sticky lg:top-6"
      >
        {submitting ? (
          <Card className="space-y-3">
            <p className="sr-only">{t.runner.generating}</p>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ) : !result ? (
          <div className="hidden rounded-lg border border-dashed border-ink-200 p-8 text-center text-sm text-ink-600 lg:block">
            {t.runner.placeholder}
          </div>
        ) : (
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium text-ink-950">{t.runner.result}</h2>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => void generate()}>
                  {t.runner.regenerate}
                </Button>
                <CopyButton text={result.output} />
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-950">{result.output}</p>
            {!result.saved && (
              <p className="text-xs text-upgrade-ink">{t.runner.notSaved}</p>
            )}
            {result.remaining !== "unlimited" && (
              <p className="text-xs text-ink-600">
                {isGuest ? t.runner.guestLeft(result.remaining) : t.runner.periodLeft(result.remaining)}
              </p>
            )}
            {isGuest && (
              // The "save to history" value trigger (architecture doc §8):
              // offered right where the result is, not as a blocking modal.
              <div className="rounded-md bg-accent-subtle p-3 text-sm text-ink-950">
                {t.runner.keepBefore}{" "}
                <Link
                  href="/register"
                  className="font-medium text-accent underline"
                >
                  {t.runner.keepLink}
                </Link>{" "}
                {t.runner.keepAfter}
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
