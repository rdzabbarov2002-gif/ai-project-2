import { type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-sm border border-ink-200 bg-surface px-3 py-2 text-base text-ink-950 sm:text-sm placeholder:text-ink-400",
        "focus:outline-none focus:ring-2 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
