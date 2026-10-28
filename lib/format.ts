import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";

/** "September 27, 2026" from "2026-09-27" — the same on every server. */
export function formatDay(date: string, locale: Locale = "en") {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(INTL_LOCALE[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
