import { requireUser } from "@/lib/supabase/auth";

/**
 * Defense-in-depth auth gate for Dashboard / Company Profile / History /
 * Billing. Middleware already redirects unauthenticated requests before
 * they get here (see root middleware.ts) — this second check is what
 * guarantees no protected page can ever render for a logged-out request
 * even if middleware is bypassed or its matcher is edited incorrectly
 * later.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
