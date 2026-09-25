"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/templates/ErrorState";

export default function TemplatesLibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[templates library]", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <ErrorState />
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
