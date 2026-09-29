"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signUp, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { LegalLinks } from "@/components/layout/LegalLinks";
import { useMessages } from "@/components/providers/LocaleProvider";

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const t = useMessages();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t.auth.creating : t.auth.create}
    </Button>
  );
}

export default function RegisterPage() {
  const t = useMessages();
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {/* Way back to the rest of the app — these pages sit outside the
          (guest)/(auth) layouts and their navigation (Stage 14). */}
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">{t.auth.registerTitle}</h1>
        <p className="text-sm text-ink-600">{t.auth.registerLead}</p>
        <form action={formAction} className="space-y-3">
          <Input
            type="email"
            name="email"
            placeholder={t.auth.email}
            aria-label={t.auth.email}
            required
            autoComplete="email"
            defaultValue={state.email}
          />
          <Input
            type="password"
            name="password"
            placeholder={t.auth.passwordMin}
            aria-label={t.auth.password}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton />
        </form>
        <p className="text-sm text-ink-600">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="text-accent underline">
            {t.nav.signIn}
          </Link>
        </p>
      </Card>
      <LegalLinks language />
    </main>
  );
}
