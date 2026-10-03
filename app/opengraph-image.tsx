import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * The link preview image (Open Graph and X) for every page — the pages
 * name it through config/site.ts. Built once, at build time, in the brand
 * colors (config/design-tokens.md).
 */
export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#1E56E0",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, opacity: 0.85 }}>{site.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Marketing copy for your business, in seconds.
          </div>
          <div style={{ fontSize: 34, opacity: 0.85 }}>
            Ads, emails and social posts from one company profile — no prompts to write.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>Try any tool free, no sign-up needed</div>
      </div>
    ),
    size,
  );
}
