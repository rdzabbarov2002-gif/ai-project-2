import clsx from "clsx";

/**
 * Loading placeholder block (architecture doc §11: "Skeleton loader").
 * Purely visual — `aria-hidden`; each loading state pairs it with a
 * screen-reader text saying what's loading. The pulse stops for people who
 * prefer reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("animate-pulse rounded-md bg-ink-200 motion-reduce:animate-none", className)}
    />
  );
}
