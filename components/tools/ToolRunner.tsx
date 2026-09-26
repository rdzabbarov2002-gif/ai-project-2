"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useGuestSession } from "@/lib/guest-session/context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SignUpPrompt } from "@/components/auth/SignUpPrompt";
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
  /** Stage 11: decided server-side by the page (signed out = guest). Only
   *  changes what's *shown* — the sign-up prompts below — never what the
   *  request does; /api/generate resolves identity on its own. */
  isGuest?: boolean;
  /** The guest allowance (config/settings.ts), for the up-front hint. */
  guestGenerationLimit?: number;
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
const ERROR_ACTIONS: Record<string, { href: string; label: string }> = {
  // Signed out since the page rendered (session expired) — no guest token
  // was sent, so the API has no identity to use.
  unauthorized: { href: "/login", label: "Sign in again" },
  usage_limit_reached: { href: "/settings/billing", label: "See plans and limits" },
  template_not_in_plan: { href: "/settings/billing", label: "View plans" },
  tool_not_in_plan: { href: "/settings/billing", label: "View plans" },
};

export function ToolRunner({
  tool,
  templateSlug,
  schema,
  isGuest = false,
  guestGenerationLimit,
}: ToolRunnerProps) {
  const { session, ensureSession } = useGuestSession();
  const [values, setValues] = useState<Record<string, unknown>>(() => buildInitialValues(schema));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<GenerateSuccess | null>(null);
  const [copied, setCopied] = useState(false);
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
          guestSessionToken: isGuest ? ensureSession().sessionToken : session?.sessionToken,
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
              ? "Your session has expired — please sign in again."
              : (error?.message ?? "Something went wrong. Please try again."),
        });
        if (error?.code === "guest_limit_reached") setSignUpOpen(true);
        return;
      }

      setResult(body as GenerateSuccess);
    } catch {
      setSubmitError({
        code: "network",
        message: "Network error. Please check your connection and try again.",
      });
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

        {submitError && (
          <div className="space-y-1 text-sm">
            <p className="text-danger">{submitError.message}</p>
            {ERROR_ACTIONS[submitError.code] && !isGuest && (
              <Link
                href={ERROR_ACTIONS[submitError.code]!.href}
                className="text-accent hover:underline"
              >
                {ERROR_ACTIONS[submitError.code]!.label}
              </Link>
            )}
            {submitError.code === "guest_limit_reached" && (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => setSignUpOpen(true)}
              >
                Create a free account to continue
              </button>
            )}
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Generating…" : `Generate with ${tool.name}`}
        </Button>

        {isGuest && guestGenerationLimit !== undefined && (
          <p className="text-xs text-ink-600">
            Guest mode — up to {guestGenerationLimit} free generations, no sign-up needed.{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create a free account
            </Link>{" "}
            to save your results and get more.
          </p>
        )}
      </form>

      <SignUpPrompt
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        title="You've used your free generations"
        message="Guest mode includes a few generations to try things out. A free account gives you a monthly allowance, your history, and a company profile that tailors every result."
      />

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
            <p className="text-xs text-ink-600">
              {isGuest
                ? `${result.remaining} free guest generations left.`
                : `${result.remaining} generations left this period.`}
            </p>
          )}
          {isGuest && (
            // The "save to history" value trigger (architecture doc §8):
            // offered right where the result is, not as a blocking modal.
            <div className="rounded-md bg-accent-subtle p-3 text-sm text-ink-950">
              Want to keep this?{" "}
              <Link href="/register" className="font-medium text-accent hover:underline">
                Sign up free
              </Link>{" "}
              to save it to your history — everything you&apos;ve created as a guest carries
              over.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
