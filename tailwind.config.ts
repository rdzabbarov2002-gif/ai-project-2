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
          950: "#0E0F12",
          800: "#23262E",
          600: "#4B4F58",
          400: "#8A8E96",
          200: "#D8DAdE",
          50: "#F7F7F8",
        },
        accent: {
          DEFAULT: "#3730E0",
          hover: "#2C24B8",
          subtle: "#EEEDFC",
        },
        upgrade: {
          DEFAULT: "#F5A623",
          hover: "#D8901A",
          subtle: "#FDF3E1",
        },
        success: "#1E9E6B",
        danger: "#D64545",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
