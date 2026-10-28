import { type HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "accent" | "upgrade" | "neutral";

/**
 * Small label chip (architecture doc §11: "Badge — plan/limit"). Stage 14
 * gathers the chip markup that was repeated inline across cards and pages
 * (category, template, "Pro", "Current plan") into one primitive, with
 * token pairs that meet WCAG AA in both themes. `upgrade` (amber) is for
 * plan/limit moments only, per config/design-tokens.md.
 */
export function Badge({
  tone = "accent",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-sm px-2 py-0.5 text-xs font-medium",
        tone === "accent" && "bg-accent-subtle text-accent",
        tone === "upgrade" && "bg-upgrade-subtle text-upgrade-ink",
        tone === "neutral" && "bg-ink-200 text-ink-800",
        className,
      )}
      {...props}
    />
  );
}
