import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { listUserGenerations, type GenerationFilters } from "@/lib/history/generations";
import { listActiveTools } from "@/lib/tools/catalog";
import { HistoryItem } from "@/components/history/HistoryItem";
import { FavoriteButton } from "@/components/history/FavoriteButton";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeText } from "@/lib/i18n/catalog";

const PAGE_SIZE = 10;

/**
 * The signed-in user's generations, newest first, 10 per page (Stage 14).
 * The query itself now lives in lib/history/generations.ts (shared with
 * the Dashboard's "recent" list) — see there for the access-pattern and
 * pagination reasoning, which is unchanged.
 *
 * Stage 13 completion (architecture doc §9 "History — list, filters,
 * repeat parameters"): filter by tool and by favorites, as plain query
 * params read from `searchParams` — the same server-rendered pattern as
 * `?page=` and `?template=`, so the filter form is an ordinary GET form
 * with no client JavaScript. Pagination links carry the filters along.
 * Repeating a generation's inputs lives on its detail page.
 *
 * No loading.tsx here, on purpose: with a loading boundary around the
 * page, Next.js 15 sometimes never renders the page a Server Action sends
 * back after revalidatePath (vercel/next.js#87529) — the favorite star stayed
 * unchanged in about one try in four. Don't add one back until that is fixed.
 */
export default async function HistoryPage(props: {
  searchParams: Promise<{ page?: string; tool?: string; favorites?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const filters: GenerationFilters = {
    toolSlug: searchParams.tool || undefined,
    favoritesOnly: searchParams.favorites === "1",
  };
  const filtered = Boolean(filters.toolSlug || filters.favoritesOnly);

  const [locale, t] = await Promise.all([getLocale(), getMessages()]);
  const [{ items, hasMore }, tools] = await Promise.all([
    listUserGenerations(supabase, user.id, {
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      filters,
    }),
    listActiveTools(supabase),
  ]);

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (filters.toolSlug) params.set("tool", filters.toolSlug);
    if (filters.favoritesOnly) params.set("favorites", "1");
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/history?${query}` : "/history";
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-xl font-semibold text-ink-950">{t.history.title}</h1>

      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          name="tool"
          defaultValue={filters.toolSlug ?? ""}
          aria-label={t.history.filterByTool}
          className="sm:max-w-xs"
        >
          <option value="">{t.history.allTools}</option>
          {tools.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {localizeText(tool.name, locale)}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <Checkbox name="favorites" value="1" defaultChecked={filters.favoritesOnly} />
          {t.history.favoritesOnly}
        </label>
        <div className="flex gap-3">
          <Button type="submit" variant="secondary">
            {t.common.apply}
          </Button>
          {filtered && (
            <Link href="/history" className="self-center text-sm text-accent hover:underline">
              {t.common.clear}
            </Link>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-200 p-8 text-center text-sm text-ink-600">
          {filtered ? t.history.noMatches : t.history.none}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((generation) => (
            <div key={generation.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <HistoryItem
                  generation={{
                    ...generation,
                    toolName: localizeText(generation.toolName, locale),
                    templateName: localizeText(generation.templateName, locale),
                  }}
                />
              </div>
              <FavoriteButton id={generation.id} isFavorite={generation.isFavorite} />
            </div>
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-accent hover:underline">
              {t.history.previous}
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={pageHref(page + 1)} className="text-accent hover:underline">
              {t.history.next}
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
