"use client";

import { useMemo, useState } from "react";
import type { TemplateListItem } from "@/lib/templates/types";
import { queryTemplates, deriveCategories } from "@/lib/templates/query";
import { SearchBar } from "@/components/tools/gallery/SearchBar";
import { CategoryFilter } from "@/components/tools/gallery/CategoryFilter";
import { TemplateGrid } from "./TemplateGrid";
import { EmptyState } from "./EmptyState";
import { useMessages } from "@/components/providers/LocaleProvider";

/**
 * Same shape as components/tools/gallery/ToolGallery.tsx (Stage 7): owns
 * search/category state, derives everything shown from `templates` via
 * pure functions, never a hand-written list. Reuses SearchBar and
 * CategoryFilter directly (both already fully generic — see this stage's
 * audit for why SearchBar gained two optional props to make that true
 * without changing its existing caller's behavior); TemplateGrid/
 * TemplateCard/EmptyState are independent from their tools/ counterparts
 * because those render a different item shape and carry
 * tools-specific text, not because sharing was rejected in general.
 */
export function TemplateGallery({
  templates,
  initialSearch = "",
}: {
  templates: TemplateListItem[];
  initialSearch?: string;
}) {
  const t = useMessages();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => deriveCategories(templates), [templates]);
  const filtered = useMemo(
    () => queryTemplates(templates, { search, category, sortBy: "name" }),
    [templates, search, category],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t.templates.searchPlaceholder}
          ariaLabel={t.templates.searchLabel}
        />
        {categories.length > 0 && (
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        )}
      </div>

      {templates.length === 0 ? (
        <EmptyState reason="no-templates" />
      ) : filtered.length === 0 ? (
        <EmptyState reason="no-results" />
      ) : (
        <TemplateGrid templates={filtered} />
      )}
    </div>
  );
}
