import { type InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={clsx(
        "h-4 w-4 rounded-sm border border-ink-200 bg-surface accent-accent",
        "focus:outline-none focus:ring-2 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
