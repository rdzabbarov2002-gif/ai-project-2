import { getUser } from "@/lib/supabase/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Pages anyone can use — landing, Tools, Templates (architecture doc §3:
 * "(guest) → available without login"). Not a gate: it only picks the
 * navigation frame (Stage 14) — the guest top menu, or the signed-in
 * sidebar/tabs when a signed-in user browses these same pages.
 */
export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return <AppShell user={user}>{children}</AppShell>;
}
