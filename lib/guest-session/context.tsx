"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  ensureGuestSession,
  updateGuestProfileDraft,
  clearGuestSession,
} from "./storage";
import type { GuestCompanyProfileDraft, GuestSession } from "./types";

interface GuestSessionContextValue {
  /** null until the effect on first client render has run (SSR-safe). */
  session: GuestSession | null;
  setProfileDraft: (draft: GuestCompanyProfileDraft) => void;
  clear: () => void;
}

const GuestSessionContext = createContext<GuestSessionContextValue | null>(
  null,
);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  // Starts null so server-rendered and first-client-render markup match
  // (localStorage doesn't exist on the server) — populated in the effect.
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    setSession(ensureGuestSession());
  }, []);

  const setProfileDraft = useCallback((draft: GuestCompanyProfileDraft) => {
    setSession(updateGuestProfileDraft(draft));
  }, []);

  const clear = useCallback(() => {
    clearGuestSession();
    setSession(null);
  }, []);

  return (
    <GuestSessionContext.Provider value={{ session, setProfileDraft, clear }}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession(): GuestSessionContextValue {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) {
    throw new Error(
      "useGuestSession must be used within <GuestSessionProvider>",
    );
  }
  return ctx;
}
