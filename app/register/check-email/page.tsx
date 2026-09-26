import { Logo } from "@/components/layout/Logo";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-xl font-semibold">Check your email</h1>
        <p className="text-ink-600">
          We sent you a confirmation link. Open it to finish creating your account —
          your existing generations will carry over automatically.
        </p>
      </div>
    </main>
  );
}
