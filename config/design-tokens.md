# Design tokens — rationale

Source of truth for values lives in `tailwind.config.ts`; this file records
*why*, so later stages don't quietly drift back to generic defaults.

- **Accent — `#3730E0` (deep indigo):** one confident, saturated accent used
  for primary actions only. Deliberately not a violet-to-pink gradient
  (generic "AI product" default) and not Claude's own terracotta accent
  (`#D97757`), to keep the product's identity distinct from the tool used to
  build it.
- **Upgrade — `#F5A623` (amber):** reserved exclusively for
  upgrade/plan-limit moments, so it stays meaningful (a signal) instead of
  decorative.
- **Neutrals:** true near-black/near-white (`ink` scale), not warm-tinted —
  keeps long-form generated marketing copy (the actual product content)
  visually neutral rather than competing with the UI chrome.
- **Type:** one family (Inter) for both display and body at this stage;
  revisit with a distinct display face once real marketing content exists
  to design around (Stage 14 polish pass), not before.

## Stage 14 — theming and contrast

Colors are CSS variables (RGB channels) defined in `app/globals.css` for
light (`:root`) and dark (`.dark`); `tailwind.config.ts` maps every token
to its variable, so components keep using the same names in both themes.
The `dark` class is set before first paint from the saved choice
(`localStorage["amw_theme"]`) or the system setting.

New tokens: `surface` (cards, inputs, dialogs — white in light mode),
`accent-contrast` / `upgrade-contrast` (text on accent / amber
backgrounds) and `upgrade-ink` (amber-toned text on `upgrade-subtle`,
e.g. the "Pro" badge).

Every text/background pair the UI uses meets WCAG AA (≥ 4.5:1) in both
themes. Three pre-existing light-mode pairs did not and were corrected
here: white text on the amber upgrade button (2.0:1 → dark text, 9.5:1),
`success` (3.2:1 → `#177F56`, 4.7:1) and `danger` (4.1:1 → `#C23434`,
5.1:1).

| Pair | Light | Dark |
|---|---|---|
| `ink-950` on `ink-50` (body text) | 17.9 | 17.0 |
| `ink-600` on `surface` (secondary text) | 8.2 | 7.1 |
| `accent` on `surface` (links) | 7.9 | 7.4 |
| `accent-contrast` on `accent` (primary button) | 7.9 | 8.3 |
| `upgrade-contrast` on `upgrade` (upgrade button) | 9.5 | 9.5 |
| `upgrade-ink` on `upgrade-subtle` ("Pro" badge) | 6.8 | 9.0 |
| `accent` on `accent-subtle` (badges) | 6.8 | 6.3 |
| `success` on `surface` | 5.0 | 8.0 |
| `danger` on `surface` | 5.5 | 6.3 |

Type: still one family (Inter where installed, then the system UI font).
Loading a web font was considered and left out — `next/font/google`
fetches the font at build time, which would make builds depend on
reaching Google Fonts, for no functional gain.

## Redesign — "app" look (mobile first)

Chosen from five mockups by the product owner: the phone layout reads like
an app — the tools as big pastel tiles on the first screen, a bottom tab
bar for guests too, a one-row header. It changes the values, not the
names, so every page follows:

- **Accent — `#1E56E0` (blue)** replaces the indigo. Primary actions,
  links, the active tab.
- **Neutrals** are tinted slightly toward navy (`ink-950` `#101223`,
  page background `ink-50` `#F2F3F7`); dark mode keeps the same shape
  (`#0C0D16` page, `#181A26` surfaces).
- **Tones** (`tone-blue|green|pink|amber` and their `-ink`) — pastel tile
  backgrounds for the four tools on the landing page, each with a text
  color that passes AA on it in both themes.
- **Type: Manrope** (variable, weights 200–800) for display and body.
  Served with `next/font/local` from the `@fontsource-variable/manrope`
  package — our own origin, so the CSP's `font-src 'self'` holds and the
  build doesn't reach Google Fonts (the reason a web font was left out
  before). Latin subset; other scripts fall back to the system font.

| Pair | Light | Dark |
|---|---|---|
| `ink-950` on `ink-50` (body text) | 16.7 | 17.2 |
| `ink-600` on `surface` (secondary text) | 7.0 | 7.3 |
| `ink-600` on `ink-50` | 6.3 | 8.2 |
| `accent` on `surface` (links) | 6.1 | 7.0 |
| `accent` on `ink-50` | 5.5 | 7.8 |
| `accent-contrast` on `accent` (primary button) | 6.1 | 7.8 |
| `accent` on `accent-subtle` (badges, active tab) | 5.2 | 5.7 |
| `upgrade-ink` on `upgrade-subtle` ("Pro" badge) | 6.8 | 9.0 |
| `tone-*-ink` on `tone-*` (tool tiles) | 5.6–7.3 | 8.4–9.1 |
| `success` on `surface` | 5.0 | 8.2 |
| `danger` on `surface` | 5.5 | 6.4 |
