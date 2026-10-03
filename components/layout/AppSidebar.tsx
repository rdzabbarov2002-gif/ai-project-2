import { SignOutButton } from "@/components/auth/SignOutButton";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getMessages } from "@/lib/i18n/server";

export const APP_NAV = [
  { href: "/dashboard", label: "dashboard" },
  { href: "/tools", label: "tools" },
  { href: "/templates", label: "templates" },
  { href: "/history", label: "history" },
  { href: "/profile", label: "companyProfile" },
  { href: "/settings/billing", label: "billing" },
] as const;

/**
 * Signed-in navigation for tablet/desktop (architecture doc §7: "sidebar
 * on desktop/tablet"). Hidden below `md`, where MobileTabBar takes over.
 */
export async function AppSidebar({ email }: { email: string }) {
  const t = await getMessages();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-surface p-4 md:flex">
      <Logo href="/dashboard" />
      <nav aria-label={t.nav.main} className="mt-8 flex flex-col gap-1">
        {APP_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm"
            activeClassName="bg-accent-subtle font-medium text-accent"
            inactiveClassName="text-ink-600 hover:bg-ink-50 hover:text-ink-950"
          >
            {t.nav[item.label]}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3 border-t border-ink-200 pt-4">
        <p className="truncate text-xs text-ink-600" title={email}>
          {email}
        </p>
        <div className="flex items-center justify-between gap-2">
          <SignOutButton />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
