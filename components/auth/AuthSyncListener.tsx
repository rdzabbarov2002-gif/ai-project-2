"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGuestSession } from "@/lib/guest-session/context";

/**
 * Mounted once near the root of the app (see components/providers/AppProviders.tsx).
 * Watches for the moment a guest becomes an authenticated user and kicks off
 * the guest→user merge — the "beginning of the merge mechanism" this stage
 * is scoped to.
 *
 * What this does now: fires exactly once per sign-in, sends the guest
 * session token to /api/session/merge.
 * What it deliberately does NOT do yet: assume the merge succeeded. The
 * guest token is only cleared once the endpoint confirms the merge
 * actually happened server-side — today that endpoint reports the merge as
 * deferred (no `guest_sessions`/`generations` tables until Stage 3, no
 * write logic until Stage 11), so the token is intentionally left in place
 * so no draft data is lost in the meantime. See app/api/session/merge/route.ts.
 */
export function AuthSyncListener() {
  const { session, clear } = useGuestSession();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event !== "SIGNED_IN") return;
        if (hasAttemptedRef.current) return;
        if (!session?.sessionToken) return;

        hasAttemptedRef.current = true;

        try {
          const res = await fetch("/api/session/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestSessionToken: session.sessionToken }),
          });
          const body = await res.json().catch(() => null);

          if (res.ok && body?.status === "merged") {
            clear();
          }
          // status "deferred" (expected until Stage 11) or any error:
          // leave the guest token in place, nothing to do here.
        } catch {
          // Network failure — leave the guest token in place; it'll be
          // retried on the next sign-in event within its TTL.
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [session?.sessionToken, clear]);

  return null;
}
