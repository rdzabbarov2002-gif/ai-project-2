"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type NewPasswordState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { useMessages } from "@/components/providers/LocaleProvider";

const initialState: NewPasswordState = { error: null };

function SubmitButton() {
  const t = useMessages();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t.auth.updating : t.auth.update}
    </Button>
  );
}

export default function ResetPasswordPage() {
  const t = useMessages();
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">{t.auth.newPasswordTitle}</h1>
        <form action={formAction} className="space-y-3">
          <Input
            type="password"
            name="password"
            placeholder={t.auth.newPassword}
            aria-label={t.auth.password}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton />
        </form>
      </Card>
    </main>
  );
}
