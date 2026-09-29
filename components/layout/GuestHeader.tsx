import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";

const linkClasses = "rounded-md px-2 py-1 text-sm";
const active = "font-semibold text-ink-950";
const inactive = "text-ink-600 hover:text-ink-950";

/**
 * Top menu for visitors who aren't signed in (architecture doc §7:
 * "Guest: top menu — Tools, Templates, 'Sign up to save' (persistent
 * CTA)"). On phones it's one row — the logo and Sign in; the sections and
 * the sign-up CTA move to the bottom tab bar (MobileTabBar), so the CTA
 * stays on every guest page there too.
 */
export function GuestHeader() {
  return (
    <header className="border-b border-ink-200 bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink href="/tools" className={linkClasses} activeClassName={active} inactiveClassName={inactive}>
              Tools
            </NavLink>
            <NavLink href="/templates" className={linkClasses} activeClassName={active} inactiveClassName={inactive}>
              Templates
            </NavLink>
            <NavLink href="/pricing" className={linkClasses} activeClassName={active} inactiveClassName={inactive}>
              Pricing
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses("primary", "rounded-full px-4 py-1.5 md:hidden")}>
            Sign in
          </Link>
          <Link href="/login" className="hidden px-2 py-1 text-sm text-ink-600 hover:text-ink-950 md:inline">
            Sign in
          </Link>
          <Link href="/register" className={buttonClasses("primary", "hidden rounded-full px-4 py-1.5 md:inline-flex")}>
            Sign up to save
          </Link>
        </div>
      </div>
    </header>
  );
}
