import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";

const linkClasses = "rounded-md px-2 py-1 text-sm";
const active = "font-medium text-ink-950";
const inactive = "text-ink-600 hover:text-ink-950";

/**
 * Top menu for visitors who aren't signed in (architecture doc §7:
 * "Guest: top menu — Tools, Templates, 'Sign up to save' (persistent
 * CTA)"). The CTA stays on every guest page — it's the standing version
 * of the value-triggered prompts ToolRunner shows (Stage 11).
 */
export function GuestHeader() {
  return (
    <header className="border-b border-ink-200 bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <Logo compact />
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink href="/tools" className={linkClasses} activeClassName={active} inactiveClassName={inactive}>
              Tools
            </NavLink>
            <NavLink href="/templates" className={linkClasses} activeClassName={active} inactiveClassName={inactive}>
              Templates
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="px-2 py-1 text-sm text-ink-600 hover:text-ink-950">
            Sign in
          </Link>
          <Link href="/register" className={buttonClasses("primary", "px-3 py-1.5")}>
            Sign up to save
          </Link>
        </div>
      </div>
    </header>
  );
}
