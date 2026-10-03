import Link from "next/link";

/**
 * Brand mark + wordmark. The mark is the same shape as app/icon.svg.
 * Phones get the short name ("AI Marketing") so the header stays one row
 * — the mark alone below 380px; `compact` shows the mark alone on all
 * phones. The brand isn't translated.
 */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display font-bold tracking-tight text-ink-950">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-accent" />
        <path
          d="M16 6.5l2.4 6.1 6.1 2.4-6.1 2.4L16 23.5l-2.4-6.1-6.1-2.4 6.1-2.4z"
          className="fill-accent-contrast"
        />
      </svg>
      {compact ? (
        <span className="sr-only sm:not-sr-only">AI Marketing Workspace</span>
      ) : (
        <>
          <span className="max-[379px]:sr-only sm:hidden">AI Marketing</span>
          <span className="hidden sm:inline">AI Marketing Workspace</span>
        </>
      )}
    </Link>
  );
}
