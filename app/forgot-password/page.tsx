"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type ResetRequestState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";

const initialState: ResetRequestState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">Reset your password</h1>
        {state.sent ? (
          <p className="text-sm text-ink-600">
            Check your email. If an account exists for that address, we sent a link to choose a
            new password.
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
        <p className="text-sm text-ink-600">
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
