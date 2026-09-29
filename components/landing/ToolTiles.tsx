import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import type { ToolListItem } from "@/lib/tools/types";

type Tone = "blue" | "green" | "pink" | "amber";

const TONES: Record<Tone, string> = {
  blue: "bg-tone-blue text-tone-blue-ink",
  green: "bg-tone-green text-tone-green-ink",
  pink: "bg-tone-pink text-tone-pink-ink",
  amber: "bg-tone-amber text-tone-amber-ink",
};

const ICONS = {
  megaphone: <path d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />,
  mail: <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />,
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  doc: <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8" />,
  sparkle: <path d="M12 3l1.9 5.8L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.2Z" />,
} satisfies Record<string, ReactNode>;

/**
 * How a tool looks as a tile, by its category (the data, not the tool's
 * identity): a short label, a hint of what it writes, an icon and a tone.
 * A tool in a category not listed here still gets a tile — its own name
 * and description, the next tone in turn.
 */
const BY_CATEGORY: Record<string, { label: string; hint: string; icon: keyof typeof ICONS; tone: Tone }> = {
  Ads: { label: "Ads", hint: "Facebook, Instagram, Google…", icon: "megaphone", tone: "blue" },
  Email: { label: "Emails", hint: "Outreach & newsletters", icon: "mail", tone: "green" },
  Social: { label: "Social posts", hint: "LinkedIn, X, captions", icon: "chat", tone: "pink" },
  Content: { label: "Content", hint: "Blog, SEO, scripts", icon: "doc", tone: "amber" },
};
const TONE_ORDER: Tone[] = ["blue", "green", "pink", "amber"];
const CATEGORY_ORDER = Object.keys(BY_CATEGORY);

/** Known categories in the order above, then the rest as they came. */
const rank = (tool: ToolListItem) => {
  const index = tool.category ? CATEGORY_ORDER.indexOf(tool.category) : -1;
  return index === -1 ? CATEGORY_ORDER.length : index;
};

/** The tools as big tiles, two to a row on phones (the redesign's first screen). */
export function ToolTiles({ tools }: { tools: ToolListItem[] }) {
  const ordered = [...tools].sort((a, b) => rank(a) - rank(b));
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ordered.map((tool, index) => {
        const look = (tool.category && BY_CATEGORY[tool.category]) || null;
        return (
          <li key={tool.slug}>
            <Link
              href={`/tools/${tool.slug}`}
              className={clsx(
                "flex h-full min-h-[150px] flex-col justify-between gap-6 rounded-xl p-4 transition-transform active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50",
                TONES[look?.tone ?? TONE_ORDER[index % TONE_ORDER.length] ?? "blue"],
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-surface/70">
                <svg
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONS[look?.icon ?? "sparkle"]}
                </svg>
              </span>
              <span>
                <span className="block text-[17px] font-extrabold leading-tight tracking-tight">
                  {look?.label ?? tool.name}
                </span>
                <span className="mt-0.5 block text-[13px] font-semibold leading-snug">
                  {look?.hint ?? tool.description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
