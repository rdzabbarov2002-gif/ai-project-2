"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * Light/dark switch (Stage 14, architecture doc §11: theme through CSS
 * variables). The class on <html> is already correct before this mounts —
 * app/layout.tsx sets it pre-paint from the saved choice or the system
 * setting — so this only reads it, flips it, and remembers the choice.
 * Until someone chooses, the app keeps following the system setting,
 * including changes to it while open.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useMessages();
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = (event: MediaQueryListEvent) => {
      if (readSaved() !== null) return;
      root.classList.toggle("dark", event.matches);
      setDark(event.matches);
    };
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage unavailable (private mode) — the switch still applies for this page.
    }
    setDark(next);
  }

  const label = dark ? t.common.toLightTheme : t.common.toDarkTheme;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-md text-ink-600 hover:bg-ink-200 hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      }
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
    </button>
  );
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}
