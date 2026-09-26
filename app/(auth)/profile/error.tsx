"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/report-client-error";

/** Closes the Stage 15 audit's §1.10 finding: /profile ran the same kind of
 *  Supabase read as every other (auth) page but had no error boundary, so
 *  a failure showed Next.js's unstyled default error page. */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("profile: error boundary", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="rounded-md border border-danger p-8 text-center text-sm text-danger">
        Couldn&apos;t load your company profile right now. Please try again shortly.
      </div>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
