import { Skeleton } from "@/components/ui/Skeleton";

/** Same inline pattern as the Dashboard/History/Billing loading states —
 *  /profile was the one (auth) page without one (Stage 15 audit §1.10). */
export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <p className="sr-only" role="status">
        Loading your company profile…
      </p>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-96" />
    </main>
  );
}
