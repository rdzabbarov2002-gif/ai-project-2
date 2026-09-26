"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * A navigation link that knows whether it's the current section
 * (`aria-current="page"` plus the active style). A section is active on
 * its own path and anything under it — /history is active on /history/123.
 */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(className, active ? activeClassName : inactiveClassName)}
    >
      {children}
    </Link>
  );
}
