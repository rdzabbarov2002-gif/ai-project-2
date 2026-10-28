PWA icons referenced by `public/manifest.json` (Stage 14):

- `icon-192.png`, `icon-512.png` — the rounded brand mark (`app/icon.svg`).
- `icon-512-maskable.png` — full-bleed background with the mark inside the
  maskable safe zone, for launchers that apply their own shape.

`app/icon.svg` (favicon) and `app/apple-icon.png` (iOS home screen) are
served by Next.js's file conventions. All PNGs were rendered from the SVG
mark at their exact sizes; re-render them the same way if the mark changes.
