import { Logo } from "@/components/layout/Logo";
import { getMessages } from "@/lib/i18n/server";

export default async function CheckEmailPage() {
  const t = await getMessages();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-xl font-semibold">{t.auth.checkEmailTitle}</h1>
        <p className="text-ink-600">{t.auth.checkEmailText}</p>
      </div>
    </main>
  );
}
