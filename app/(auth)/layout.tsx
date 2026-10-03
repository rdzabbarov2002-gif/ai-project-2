import { requireUser } from "@/lib/supabase/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Defense-in-depth auth gate for Dashboard / Company Profile / History /
 * Billing. Middleware already redirects unauthenticated requests before
 * they get here (see root middleware.ts) — this second check is what
 * guarantees no protected page can ever render for a logged-out request
 * even if middleware is bypassed or its matcher is edited incorrectly
 * later.
 *
 * Stage 14: also where the signed-in navigation frame (AppShell — sidebar
 * on desktop, bottom tabs on phones) wraps every protected page.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
