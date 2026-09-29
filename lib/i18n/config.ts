/**
 * The languages the interface speaks. English is the default and the
 * language of the data (tool configs, templates, prompts); a visitor's
 * choice lives in a cookie, so addresses stay the same in every language.
 * Shared by server and client code — no server-only imports here.
 */
export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "amw_locale";
/** A year: the choice should outlive a session, like the theme's. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language chosen in a request's Cookie header — for route handlers. */
export function localeFromCookieHeader(header: string | null): Locale {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  return isLocale(match?.[1]) ? match[1] : DEFAULT_LOCALE;
}

/** Each language in its own name, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ru: "Русский" };

/** BCP 47 tags for Intl formatting (dates). */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", ru: "ru-RU" };
