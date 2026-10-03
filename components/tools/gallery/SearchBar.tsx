"use client";

import { Input } from "@/components/ui/Input";
import { useMessages } from "@/components/providers/LocaleProvider";

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
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const t = useMessages();
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? t.tools.searchPlaceholder}
      aria-label={ariaLabel ?? t.tools.searchLabel}
      className="sm:max-w-xs"
    />
  );
}
