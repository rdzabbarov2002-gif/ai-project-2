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
