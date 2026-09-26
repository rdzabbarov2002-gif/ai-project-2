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
  readGuestSession,
  ensureGuestSession,
  updateGuestProfileDraft,
  clearGuestSession,
} from "./storage";
import type { GuestCompanyProfileDraft, GuestSession } from "./types";

interface GuestSessionContextValue {
  /** null until the effect on first client render has run (SSR-safe), and
   *  null for anyone who hasn't interacted as a guest yet. */
  session: GuestSession | null;
  /** The current guest session, created (and persisted) first if there
   *  isn't one yet — call at the moment guest state is actually needed
   *  (a generation, a draft save), not on page load. */
  ensureSession: () => GuestSession;
  /** Saves the draft locally and syncs it to `guest_sessions` server-side
   *  (app/api/session/draft) — the server copy is what guest prompts and
   *  the sign-up merge read. Resolves to whether the server sync
   *  succeeded; the local copy is saved either way. */
  setProfileDraft: (draft: GuestCompanyProfileDraft) => Promise<boolean>;
  clear: () => void;
}

const GuestSessionContext = createContext<GuestSessionContextValue | null>(
  null,
);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  // Starts null so server-rendered and first-client-render markup match
  // (localStorage doesn't exist on the server) — populated in the effect.
  const [session, setSession] = useState<GuestSession | null>(null);

  // Only *reads* an existing session on load. Creation is on demand
  // (ensureSession): creating one eagerly on every page load gave every
  // signed-in visitor a fresh guest token too, which the merge listener
  // (components/auth/AuthSyncListener.tsx) would then have to POST and
  // clear on every full page load. Architecture doc §8: guest state is
  // created as the guest starts interacting, not before.
  useEffect(() => {
    setSession(readGuestSession());
  }, []);

  const ensureSession = useCallback(() => {
    const current = ensureGuestSession();
    setSession(current);
    return current;
  }, []);

  const setProfileDraft = useCallback(async (draft: GuestCompanyProfileDraft) => {
    const updated = updateGuestProfileDraft(draft);
    setSession(updated);

    try {
      const res = await fetch("/api/session/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestSessionToken: updated.sessionToken, draft }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const clear = useCallback(() => {
    clearGuestSession();
    setSession(null);
  }, []);

  return (
    <GuestSessionContext.Provider value={{ session, ensureSession, setProfileDraft, clear }}>
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
