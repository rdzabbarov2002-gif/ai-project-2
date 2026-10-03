"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_AFTER_MS = 3000;

/**
 * Brief, non-blocking confirmations (architecture doc §11: "Toast") —
 * e.g. "Copied to clipboard". One at a time, announced to screen readers
 * through a polite live region, dismissed automatically. Mounted once in
 * AppProviders (the place its comment reserved for "theme, toasts, etc.").
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ message: string; tone: ToastTone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ message, tone });
    timer.current = setTimeout(() => setCurrent(null), DISMISS_AFTER_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
      >
        {current && (
          <div
            className={
              current.tone === "error"
                ? "rounded-md border border-danger bg-surface px-4 py-2 text-sm text-danger shadow-lg"
                : "rounded-md border border-ink-200 bg-surface px-4 py-2 text-sm text-ink-950 shadow-lg"
            }
          >
            {current.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
