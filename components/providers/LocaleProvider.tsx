"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { MESSAGES, type Messages } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * The request's language for Client Components. The server decides it
 * (the cookie, lib/i18n/server.ts) and passes only the code; the
 * dictionaries themselves are imported here, because their functions
 * ("3 generations left") can't cross from server to client as props.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages(): Messages {
  return MESSAGES[useContext(LocaleContext)];
}
