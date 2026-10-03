import type { Config } from "tailwindcss";

/**
 * Design tokens — foundation only (Stage 1).
 * Full component library is built out from Stage 6 onward.
 *
 * Palette rationale: deep indigo (#3730E0) as the single confident accent —
 * signals "AI" without leaning on the generic violet-gradient SaaS default;
 * paired with a warm amber (#F5A623) reserved for upgrade/CTA moments only,
 * so it stays meaningful instead of decorative. Neutral scale is a true
 * near-black/near-white, not tinted, per the design system rationale in
 * /config/design-tokens.md.
 */
/**
 * Stage 14: every color is a CSS variable (RGB channels, defined in
 * app/globals.css for light and `.dark`), so the whole UI switches theme
 * without a single component knowing — components keep using the same
 * semantic names (`ink-950`, `accent`, `surface`…). `<alpha-value>` keeps
 * opacity modifiers like `bg-ink-950/50` working. Values and the contrast
 * checks behind them are documented in config/design-tokens.md.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: token("ink-950"),
          800: token("ink-800"),
          600: token("ink-600"),
          400: token("ink-400"),
          200: token("ink-200"),
          50: token("ink-50"),
        },
        /** Raised surfaces (cards, inputs, dialogs) — white in light mode. */
        surface: token("surface"),
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          subtle: token("accent-subtle"),
          /** Text on an accent background. */
          contrast: token("accent-contrast"),
        },
        upgrade: {
          DEFAULT: token("upgrade"),
          hover: token("upgrade-hover"),
          subtle: token("upgrade-subtle"),
          /** Text on an upgrade (amber) background. */
          contrast: token("upgrade-contrast"),
          /** Amber-toned text on `upgrade-subtle` (e.g. the "Pro" badge). */
          ink: token("upgrade-ink"),
        },
        success: token("success"),
        danger: token("danger"),
        /** Pastel tile backgrounds and their text (landing page tools). */
        tone: {
          blue: token("tone-blue"),
          "blue-ink": token("tone-blue-ink"),
          green: token("tone-green"),
          "green-ink": token("tone-green-ink"),
          pink: token("tone-pink"),
          "pink-ink": token("tone-pink-ink"),
          amber: token("tone-amber"),
          "amber-ink": token("tone-amber-ink"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "22px",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
