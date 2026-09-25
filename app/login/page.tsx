"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

// `searchParams` arrives as a prop straight from the router — deliberately
// not useSearchParams() here, which would require wrapping this form in a
// <Suspense> boundary to avoid a "should be wrapped in a suspense boundary"
// build error on `next build`. A plain prop has no such requirement.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const [state, formAction] = useFormState(signIn, initialState);
  const next = searchParams?.next ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">Sign in</h1>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
          <Input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton />
        </form>
        <p className="text-sm text-ink-600">
          No account yet?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </main>
  );
}
