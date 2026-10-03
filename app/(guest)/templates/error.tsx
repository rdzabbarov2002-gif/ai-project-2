"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/templates/ErrorState";
import { reportClientError } from "@/lib/report-client-error";
import { useMessages } from "@/components/providers/LocaleProvider";

export default function TemplatesLibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useMessages();
  useEffect(() => {
    reportClientError("templates library: error boundary", error);
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
