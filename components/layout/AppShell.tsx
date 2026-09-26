import type { ReactNode } from "react";
import { GuestHeader } from "./GuestHeader";
import { AppSidebar } from "./AppSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The one responsive navigation frame (architecture doc §7): guests get
 * the top menu; signed-in users get a sidebar on tablet/desktop and a top
 * bar + bottom tab bar on phones. Used by the (guest) and (auth) route
 * group layouts, which already know who the visitor is — this component
 * does no data fetching.
 */
export function AppShell({ user, children }: { user: { email?: string } | null; children: ReactNode }) {
  const skipLink = (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
    >
      Skip to content
    </a>
  );

  if (!user) {
    return (
      <>
        {skipLink}
        <GuestHeader />
        <div id="content">{children}</div>
      </>
    );
  }

  return (
    <div className="md:flex">
      {skipLink}
      <AppSidebar email={user.email ?? ""} />
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-ink-200 bg-surface px-4 py-3 md:hidden">
          <Logo href="/dashboard" compact />
          <ThemeToggle />
        </header>
        <div id="content" className="pb-24 md:pb-0">
          {children}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
