"use client";

import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type ResetRequestState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { useMessages } from "@/components/providers/LocaleProvider";

const initialState: ResetRequestState = { error: null, sent: false };

function SubmitButton() {
  const t = useMessages();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t.common.sending : t.auth.sendReset}
    </Button>
  );
}

// `searchParams` as a prop, not useSearchParams() — see app/login/page.tsx.
export default function ForgotPasswordPage(props: { searchParams: Promise<{ error?: string }> }) {
  const t = useMessages();
  const searchParams = use(props.searchParams);
  const [state, formAction] = useActionState(requestPasswordReset, initialState);
  // Set by /auth/callback when a reset link can't be used any more.
  const linkError =
    searchParams.error === "expired" ? t.auth.badReset : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">{t.auth.resetTitle}</h1>
        {state.sent ? (
          <p className="text-sm text-ink-600">{t.auth.resetSent}</p>
        ) : (
          <form action={formAction} className="space-y-3">
            {linkError && <p className="text-sm text-danger">{linkError}</p>}
            <Input
              type="email"
              name="email"
              placeholder={t.auth.email}
              aria-label={t.auth.email}
              required
              autoComplete="email"
              defaultValue={state.email}
            />
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
        <p className="text-sm text-ink-600">
          <Link href="/login" className="text-accent hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </p>
      </Card>
    </main>
  );
}
