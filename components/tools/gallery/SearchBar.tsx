"use client";

import { Input } from "@/components/ui/Input";

/**
 * `placeholder`/`ariaLabel` are optional, defaulting to the original
 * tools-specific text — ToolGallery's existing call site
 * (`<SearchBar value={search} onChange={setSearch} />`) is untouched,
 * behaves identically. Added only because Stage 10 needs this same,
 * otherwise fully generic component for the Templates Library, where
 * "Search tools…" would be a visibly wrong label, not a style
 * difference — the alternative was either a second, near-duplicate
 * component or shipping a mislabeled search box.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search tools…",
  ariaLabel = "Search tools",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="sm:max-w-xs"
    />
  );
}
