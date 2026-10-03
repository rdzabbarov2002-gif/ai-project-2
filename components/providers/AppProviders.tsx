"use client";

import type { ReactNode } from "react";
import { GuestSessionProvider } from "@/lib/guest-session/context";
import { AuthSyncListener } from "@/components/auth/AuthSyncListener";
import { ToastProvider } from "@/components/ui/Toast";
import { LocaleProvider } from "./LocaleProvider";
import type { Locale } from "@/lib/i18n/config";

/**
 * Single mount point for all client-side, app-wide providers. Root
 * layout.tsx (a Server Component) renders this once so future providers
 * (theme, toasts, etc.) have one obvious place to be added rather than
 * accumulating ad hoc wrappers in layout.tsx itself.
 */
export function AppProviders({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleProvider locale={locale}>
      <GuestSessionProvider>
        <ToastProvider>
          <AuthSyncListener />
          {children}
        </ToastProvider>
      </GuestSessionProvider>
    </LocaleProvider>
  );
}
