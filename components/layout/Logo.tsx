import Link from "next/link";

/** Brand mark + wordmark. The mark is the same shape as app/icon.svg. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display font-semibold text-ink-950">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path
          d="M16 6.5l2.4 6.1 6.1 2.4-6.1 2.4L16 23.5l-2.4-6.1-6.1-2.4 6.1-2.4z"
          className="fill-accent-contrast"
        />
      </svg>
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>AI Marketing Workspace</span>
    </Link>
  );
}
