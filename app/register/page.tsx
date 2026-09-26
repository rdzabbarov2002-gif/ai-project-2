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

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {/* Way back to the rest of the app — these pages sit outside the
          (guest)/(auth) layouts and their navigation (Stage 14). */}
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-ink-600">
          Your generations so far will carry over — nothing is lost by signing up.
        </p>
        <form action={formAction} className="space-y-3">
          <Input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoComplete="email"
            defaultValue={state.email}
          />
          <Input
            type="password"
            name="password"
            placeholder="Password (min. 8 characters)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton />
        </form>
        <p className="text-sm text-ink-600">
          Already have an account?{" "}
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>
        </p>
      </Card>
      <LegalLinks />
    </main>
  );
}
