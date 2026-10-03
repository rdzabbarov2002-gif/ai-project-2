/**
 * localStorage key for the light/dark choice — shared by the pre-paint
 * script (app/layout.tsx, a Server Component) and ThemeToggle (client).
 * Lives in a plain module because a value exported from a "use client"
 * file arrives in a Server Component as a client reference, not a string.
 */
export const THEME_STORAGE_KEY = "amw_theme";
