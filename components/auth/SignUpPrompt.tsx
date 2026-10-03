"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * The contextual sign-up modal from the architecture doc (§8, §9 "Sign Up
 * modal — appears on a value trigger"): shown when a guest hits
 * something only an account can give them — here, running out of guest
 * generations (ToolRunner, `guest_limit_reached`). Not a gate by itself:
 * the server already refused the request; this explains why and what
 * signing up gets them.
 *
 * Built on the native <dialog> element (`showModal()`): focus is moved in
 * and trapped, Escape closes it, the page behind is inert, and the
 * backdrop comes for free — no dependency, no hand-rolled focus trap.
 */
export function SignUpPrompt({
  open,
  onClose,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
}) {
  const t = useMessages();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="w-[calc(100%-2rem)] max-w-sm rounded-lg border border-ink-200 bg-surface p-6 text-ink-950 backdrop:bg-ink-950/50"
    >
      <div className="space-y-4">
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-ink-600">{message}</p>
        <p className="text-sm text-ink-600">{t.signUpPrompt.carriesOver}</p>
        <div className="flex flex-col gap-2">
          <Link href="/register" className={buttonClasses("primary", "w-full")}>
            {t.common.createFreeAccount}
          </Link>
          <Link href="/login" className={buttonClasses("secondary", "w-full")}>
            {t.signUpPrompt.haveAccount}
          </Link>
          <Button type="button" variant="secondary" className="w-full border-0" onClick={onClose}>
            {t.signUpPrompt.notNow}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
