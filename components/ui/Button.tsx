import { type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "upgrade";

/**
 * The button look as a class string, so a `<Link>` that acts as a
 * call-to-action (sign-up prompts, "View plans") can share it exactly
 * instead of re-typing the same Tailwind classes next to every link.
 */
export function buttonClasses(variant: Variant = "primary", className?: string): string {
  return clsx(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary" && "bg-accent text-accent-contrast hover:bg-accent-hover",
    variant === "secondary" &&
      "bg-ink-50 text-ink-950 hover:bg-ink-200 border border-ink-200",
    variant === "upgrade" && "bg-upgrade text-upgrade-contrast hover:bg-upgrade-hover",
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
