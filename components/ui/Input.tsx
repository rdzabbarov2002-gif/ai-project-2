import { type InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-sm border border-ink-200 bg-surface px-3 py-2 text-base text-ink-950 placeholder:text-ink-400 sm:text-sm",
        "focus:outline-none focus:ring-2 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
