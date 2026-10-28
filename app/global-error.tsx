"use client";

import NextError from "next/error";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

/**
 * Last-resort boundary for errors no segment's error.tsx catches —
 * including the root layout itself. Exists so those errors reach Sentry;
 * what it renders is Next.js's own default error page, unchanged.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportClientError("global error boundary", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
