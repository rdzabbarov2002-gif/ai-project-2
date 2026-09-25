"use client";

import { useMemo, useState } from "react";
import type { ToolListItem } from "@/lib/tools/types";
import { queryTools, deriveCategories } from "@/lib/tools/query";
import { SearchBar } from "./SearchBar";
import { CategoryFilter } from "./CategoryFilter";
import { ToolGrid } from "./ToolGrid";
import { EmptyState } from "./EmptyState";

/**
 * Owns search/category/sort state and nothing else — data fetching
 * already happened server-side (app/(guest)/tools/page.tsx), and layout
 * is ToolGrid's job. `tools` is the full active catalog for this render;
 * `queryTools`/`deriveCategories` (lib/tools/query.ts) derive everything
 * shown from it, never from a hand-written list.
 */
export function ToolGallery({ tools }: { tools: ToolListItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => deriveCategories(tools), [tools]);
  const filtered = useMemo(
    () => queryTools(tools, { search, category, sortBy: "name" }),
    [tools, search, category],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        {categories.length > 0 && (
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        )}
      </div>

      {tools.length === 0 ? (
        <EmptyState reason="no-tools" />
      ) : filtered.length === 0 ? (
        <EmptyState reason="no-results" />
      ) : (
        <ToolGrid tools={filtered} />
      )}
    </div>
  );
}
