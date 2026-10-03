import { Skeleton } from "@/components/ui/Skeleton";
import { getMessages } from "@/lib/i18n/server";

export default async function BillingSettingsLoading() {
  const t = await getMessages();
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <p className="sr-only" role="status">
        {t.billing.loading}
      </p>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-32 max-w-2xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </main>
  );
}
