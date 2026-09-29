import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { getLocale } from "@/lib/i18n/server";
import { pageMetadata, site, siteOrigin } from "@/config/site";

// Link previews (Open Graph, X) for every page; each public page sets its
// own title and description (config/site.ts, pageMetadata).
export const metadata: Metadata = {
  ...pageMetadata(site.title, site.description, "/"),
  metadataBase: new URL(siteOrigin()),
  title: { default: site.title, template: `%s · ${site.name}` },
  // Only public pages name their own canonical address.
  alternates: undefined,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Marketing Workspace",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F3F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0D16" },
  ],
};

/**
 * Manrope, served from our own origin (the CSP allows fonts from 'self'
 * only) — the files come from the npm package at build time, so builds
 * don't depend on reaching Google Fonts. Two subsets as two families in
 * one font stack (globals.css): Latin, and Cyrillic for the Russian
 * interface — the browser takes each letter from the first that has it,
 * and fetches the Cyrillic file only when a page uses it.
 */
const manrope = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});
const manropeCyrillic = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-cyrillic-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope-cyrillic",
  display: "swap",
  preload: false,
});

/**
 * Runs before first paint (Stage 14): applies the saved theme, or the
 * system one, so a dark-mode visitor never sees a flash of the light UI.
 * Kept tiny and dependency-free; ThemeToggle takes over after hydration.
 */
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This request's CSP nonce (middleware.ts): without it the browser
  // won't run the two inline scripts below.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();

  return (
    // suppressHydrationWarning: the theme script above may add `dark` to
    // this element before React hydrates — an expected, one-attribute
    // difference, not a mismatch worth warning about.
    <html lang={locale} className={`${manrope.variable} ${manropeCyrillic.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders locale={locale}>{children}</AppProviders>
        {/* Core Web Vitals from real visits (docs/production.md): Vercel
            Speed Insights, production only — no cookies, same origin. */}
        {process.env.VERCEL_ENV === "production" && (
          <script nonce={nonce} defer src="/_vercel/speed-insights/script.js" />
        )}
        {/* Service worker registration (Stage 1); the worker's caching is Stage 14's (public/sw.js). */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
