"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword, type NewPasswordState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";

const initialState: NewPasswordState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(updatePassword, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">Choose a new password</h1>
        <form action={formAction} className="space-y-3">
          <Input
            type="password"
            name="password"
            placeholder="New password (min. 8 characters)"
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
