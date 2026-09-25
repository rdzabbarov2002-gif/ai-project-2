import { appSettings } from "@/config/settings";
import type { GuestCompanyProfileDraft, GuestSession } from "./types";

/**
 * Low-level localStorage read/write for the guest session. Kept dependency-
 * free and framework-free on purpose (no React here) so it can be called
 * from the auth-sync listener, the context provider, or a future non-React
 * caller without pulling in React.
 *
 * `lib/guest-session/context.tsx` is the React-facing API most components
 * should use instead of calling this module directly.
 */

const STORAGE_KEY = "amw_guest_session";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateSessionToken(): string {
  // crypto.randomUUID is available in all modern browsers and in the
  // Edge/Node runtimes Next.js uses — no uuid dependency needed.
  return crypto.randomUUID();
}

export function readGuestSession(): GuestSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GuestSession;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    // Corrupt value (e.g. edited by hand, or a shape from a future version) —
    // fail safe by discarding rather than throwing.
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function createGuestSession(): GuestSession {
  const now = new Date();
  const expires = new Date(
    now.getTime() + appSettings.guestSessionTtlDays * 24 * 60 * 60 * 1000,
  );

  const session: GuestSession = {
    sessionToken: generateSessionToken(),
    companyProfileDraft: null,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function ensureGuestSession(): GuestSession {
  return readGuestSession() ?? createGuestSession();
}

export function updateGuestProfileDraft(
  draft: GuestCompanyProfileDraft,
): GuestSession {
  const current = ensureGuestSession();
  const updated: GuestSession = { ...current, companyProfileDraft: draft };
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function clearGuestSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
