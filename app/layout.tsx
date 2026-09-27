import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export const metadata: Metadata = {
  title: "AI Marketing Workspace",
  description:
    "AI-powered marketing tools for small businesses — ads, emails and social posts generated from one company profile.",
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
    { media: "(prefers-color-scheme: light)", color: "#F7F7F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F12" },
  ],
};

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

  return (
    // suppressHydrationWarning: the theme script above may add `dark` to
    // this element before React hydrates — an expected, one-attribute
    // difference, not a mismatch worth warning about.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
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
