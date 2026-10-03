"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGuestSession } from "@/lib/guest-session/context";

/**
 * Mounted once near the root of the app (see components/providers/AppProviders.tsx).
 * Moves a guest's data into their account (POST /api/session/merge) as
 * soon as the same browser is signed in, and clears the guest token only
 * once the server confirms `status: "merged"` — any other outcome leaves
 * the token in place, so nothing a guest created is lost to a failed
 * request.
 *
 * Phase 1 fix: the Stage 2 version only reacted to a `SIGNED_IN` auth
 * event, which in practice almost never reached it with a guest token in
 * hand — sign-in happens server-side (Server Action / email-confirmation
 * callback), so the browser either sees the session as `INITIAL_SESSION`
 * on the next full load, or sees nothing at all after a Server Action's
 * soft redirect; and on a full load the recovered-session `SIGNED_IN`
 * fired before the guest token had been read from localStorage. Instead
 * of depending on which event arrives when, this checks the actual state
 * — "is there a guest token, and is this browser signed in?" — whenever
 * either could have changed: on load, once the token is known, on every
 * navigation (which covers the Server Action redirect), and on a live
 * `SIGNED_IN` (e.g. from another tab).
 */
export function AuthSyncListener() {
  const { session, clear } = useGuestSession();
  const router = useRouter();
  const pathname = usePathname();
  const token = session?.sessionToken;

  // One merge attempt per token (reset by a fresh SIGNED_IN); the in-flight
  // flag stops the navigation and auth-event triggers from racing each
  // other into two concurrent requests.
  const attemptedTokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const tryMerge = useCallback(async () => {
    if (!token || attemptedTokenRef.current === token || inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      // Reads the session from the auth cookie (no network call unless
      // the token needs refreshing) — cheap enough to run per navigation.
      const {
        data: { session: authSession },
      } = await createClient().auth.getSession();
      if (!authSession) return;

      attemptedTokenRef.current = token;

      const res = await fetch("/api/session/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestSessionToken: token }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.status === "merged") {
        clear();
        // Server Components already on screen (Dashboard, History) were
        // rendered before the merge — re-render them with the moved data.
        if (body.generationsMerged > 0 || body.companyProfileCreated) {
          router.refresh();
        }
      }
      // Any error: leave the guest token in place — it's retried on the
      // next sign-in event or full page load, within its TTL.
    } catch {
      // Network failure — same as above, the token stays for a later retry.
    } finally {
      inFlightRef.current = false;
    }
  }, [token, clear, router]);

  useEffect(() => {
    void tryMerge();
  }, [tryMerge, pathname]);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      attemptedTokenRef.current = null;
      // Deferred, not called inline: tryMerge() calls auth.getSession(),
      // and supabase-js documents that calling back into auth from inside
      // this callback can deadlock on its internal lock.
      setTimeout(() => void tryMerge(), 0);
    });

    return () => data.subscription.unsubscribe();
  }, [tryMerge]);

  return null;
}
