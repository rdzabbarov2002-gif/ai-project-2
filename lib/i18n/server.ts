import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { MESSAGES, type Messages } from "./messages";

/**
 * This request's language: the visitor's choice (cookie), else English —
 * also outside a request (unit tests, build-time rendering), where there
 * are no cookies to read.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch (error) {
    // Next's own signals (e.g. "this page is dynamic") must go through.
    unstable_rethrow(error);
    return DEFAULT_LOCALE;
  }
});

/** This request's dictionary, for Server Components and Server Actions. */
export async function getMessages(): Promise<Messages> {
  return MESSAGES[await getLocale()];
}

/** A date in this request's language ("27 сентября 2026 г."). */
export async function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(INTL_LOCALE[await getLocale()], options).format(new Date(value));
}
