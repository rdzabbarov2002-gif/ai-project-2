"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/report-client-error";
import { useMessages } from "@/components/providers/LocaleProvider";

export default function BillingSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useMessages();
  useEffect(() => {
    reportClientError("settings/billing: error boundary", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="rounded-md border border-danger p-8 text-center text-sm text-danger">
        {t.billing.loadError}
      </div>
      <Button variant="secondary" onClick={reset}>
        {t.common.tryAgain}
      </Button>
    </main>
  );
}
