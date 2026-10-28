"use client";

import { useState } from "react";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * Copy-to-clipboard (architecture doc Stage 14: "Copy-to-clipboard"),
 * used on the generation result and on a saved generation in History.
 * The async Clipboard API needs a secure context and permission; where
 * it's unavailable (older mobile browsers, http origins) this falls back
 * to the legacy selection-based copy before giving up with a message —
 * never an unhandled rejection.
 */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useMessages();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    setCopied(ok);
    toast(ok ? t.common.copiedToast : t.common.copyFailedToast, ok ? "success" : "error");
  }

  return (
    <Button type="button" variant="secondary" onClick={handleCopy}>
      {copied ? t.common.copied : (label ?? t.common.copy)}
    </Button>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
