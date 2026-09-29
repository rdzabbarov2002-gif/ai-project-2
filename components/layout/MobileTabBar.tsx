import type { ReactNode } from "react";
import { NavLink } from "./NavLink";
import { getMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";

type Tab = { href: string; label: keyof Messages["nav"]; icon: ReactNode };

const HOME = <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
const TOOLS = <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />;
const TEMPLATES = <path d="m12 2 10 5-10 5L2 7l10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const PERSON = <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />;

const TABS: Record<"guest" | "member", Tab[]> = {
  // Guests: what they can use without an account, then the way to keep it.
  guest: [
    { href: "/", label: "home", icon: HOME },
    { href: "/tools", label: "tools", icon: TOOLS },
    { href: "/templates", label: "templates", icon: TEMPLATES },
    { href: "/pricing", label: "pricing", icon: <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01" /> },
    { href: "/register", label: "signUp", icon: PERSON },
  ],
  member: [
    { href: "/dashboard", label: "home", icon: HOME },
    { href: "/tools", label: "tools", icon: TOOLS },
    { href: "/templates", label: "templates", icon: TEMPLATES },
    { href: "/history", label: "history", icon: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" /> },
    { href: "/profile", label: "profile", icon: PERSON },
  ],
};

/**
 * Navigation on phones (architecture doc §7), for guests and signed-in
 * users alike — the app-like layout from the redesign
 * (config/design-tokens.md): five tabs fixed to the bottom, respecting
 * the iOS home-indicator inset; AppShell pads the content so nothing
 * hides behind it. Billing stays reachable from the Dashboard.
 */
export async function MobileTabBar({ variant }: { variant: "guest" | "member" }) {
  const t = await getMessages();
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS[variant].map((tab) => (
          <li key={tab.href}>
            <NavLink
              href={tab.href}
              className="flex flex-col items-center gap-1 px-0.5 pb-2 pt-2.5 text-center text-[11px] font-semibold leading-tight"
              activeClassName="text-accent"
              inactiveClassName="text-ink-600"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {tab.icon}
              </svg>
              {t.nav[tab.label]}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
