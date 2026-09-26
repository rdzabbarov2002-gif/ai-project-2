import type { ReactNode } from "react";
import { NavLink } from "./NavLink";

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/tools",
    label: "Tools",
    icon: <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />,
  },
  {
    href: "/templates",
    label: "Templates",
    icon: <path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" />,
  },
  {
    href: "/history",
    label: "History",
    icon: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
  },
];

/**
 * Signed-in navigation on phones (architecture doc §7: "mobile — bottom
 * tab bar: Tools / Templates / History / Profile"). Fixed to the bottom,
 * respecting the iOS home-indicator inset; AppShell pads the content so
 * nothing hides behind it. Dashboard and Billing stay reachable from the
 * top bar's logo and the Dashboard itself.
 */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <NavLink
              href={tab.href}
              className="flex flex-col items-center gap-1 py-2 text-xs"
              activeClassName="font-medium text-accent"
              inactiveClassName="text-ink-600"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {tab.icon}
              </svg>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
