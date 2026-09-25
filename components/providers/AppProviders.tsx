"use client";

import type { ReactNode } from "react";
import { GuestSessionProvider } from "@/lib/guest-session/context";
import { AuthSyncListener } from "@/components/auth/AuthSyncListener";

/**
 * Single mount point for all client-side, app-wide providers. Root
 * layout.tsx (a Server Component) renders this once so future providers
 * (theme, toasts, etc.) have one obvious place to be added rather than
 * accumulating ad hoc wrappers in layout.tsx itself.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GuestSessionProvider>
      <AuthSyncListener />
      {children}
    </GuestSessionProvider>
  );
}
