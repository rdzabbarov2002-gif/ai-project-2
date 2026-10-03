"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/report-client-error";
import { useMessages } from "@/components/providers/LocaleProvider";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useMessages();
  useEffect(() => {
    reportClientError("history: error boundary", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="rounded-md border border-danger p-8 text-center text-sm text-danger">
        {t.history.loadError}
      </div>
      <Button variant="secondary" onClick={reset}>
        {t.common.tryAgain}
      </Button>
    </main>
  );
}
