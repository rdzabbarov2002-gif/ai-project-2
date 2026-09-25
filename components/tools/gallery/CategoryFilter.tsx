"use client";

import { Select } from "@/components/ui/Select";

/** Reuses the Select primitive built for ToolRunner's SelectField (Stage 6)
 *  — a plain filter dropdown needed nothing that primitive doesn't
 *  already provide. `categories` always comes from
 *  `lib/tools/query.ts`'s `deriveCategories()`, never a hand-written list. */
export function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      aria-label="Filter by category"
      className="sm:max-w-xs"
    >
      <option value="">All categories</option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </Select>
  );
}
