"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALES } from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/components/providers/LocaleProvider";

/**
 * English ⇄ Russian. Remembers the choice in a cookie (the server renders
 * every page in it, lib/i18n/server.ts) and re-renders the current page —
 * no reload, same address.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useMessages();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = LOCALES.find((candidate) => candidate !== locale) ?? locale;

  function switchLanguage() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = next;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={pending}
      aria-label={t.language.switchTo}
      title={t.language.switchTo}
      lang={next}
      className={
        className ??
        "flex h-9 items-center gap-1 rounded-md px-2 text-sm font-bold text-ink-600 hover:bg-ink-200 hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
      <span aria-hidden="true">{t.language.other}</span>
    </button>
  );
}
