"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/tools/gallery/ErrorState";
import { reportClientError } from "@/lib/report-client-error";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * Next.js error boundary convention: must be a Client Component, receives
 * {error, reset}. Catches whatever listActiveTools() throws
 * (ToolCatalogError, lib/tools/catalog.ts) — the actual error is logged
 * here (server-side detail stays out of ErrorState's rendered message,
 * same as Stage 5's route.ts never echoing provider/DB errors verbatim).
 */
export default function ToolsGalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useMessages();
  useEffect(() => {
    reportClientError("tools gallery: error boundary", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <ErrorState />
      <Button variant="secondary" onClick={reset}>
        {t.common.tryAgain}
      </Button>
    </main>
  );
}
