"use client";

import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn, type AuthFormState } from "./actions";
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
      {pending ? t.auth.signingIn : t.nav.signIn}
    </Button>
  );
}

// `searchParams` arrives as a prop straight from the router (a Promise
// since Next.js 15, unwrapped with use()) — deliberately not
// useSearchParams() here, which would require wrapping this form in a
// <Suspense> boundary to avoid a "should be wrapped in a suspense boundary"
// build error on `next build`. A plain prop has no such requirement.
export default function LoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const t = useMessages();
  const searchParams = use(props.searchParams);
  const [state, formAction] = useActionState(signIn, initialState);
  const next = searchParams.next ?? "/dashboard";
  const linkError =
    searchParams.error === "confirmation" ? t.auth.badConfirmation : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {/* Way back to the rest of the app — these pages sit outside the
          (guest)/(auth) layouts and their navigation (Stage 14). */}
      <Logo />
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl font-semibold">{t.auth.signInTitle}</h1>
        {linkError && <p className="text-sm text-danger">{linkError}</p>}
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
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
            placeholder={t.auth.password}
            aria-label={t.auth.password}
            required
            autoComplete="current-password"
          />
          <p className="text-right text-sm">
            <Link href="/forgot-password" className="text-accent hover:underline">
              {t.auth.forgot}
            </Link>
          </p>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton />
        </form>
        <p className="text-sm text-ink-600">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-accent underline">
            {t.auth.createOne}
          </Link>
        </p>
      </Card>
      <LegalLinks language />
    </main>
  );
}
