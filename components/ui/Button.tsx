import { type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "upgrade";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
        variant === "secondary" &&
          "bg-ink-50 text-ink-950 hover:bg-ink-200 border border-ink-200",
        variant === "upgrade" && "bg-upgrade text-white hover:bg-upgrade-hover",
        className,
      )}
      {...props}
    />
  );
}
