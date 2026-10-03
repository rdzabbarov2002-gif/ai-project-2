import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/history/FavoriteButton";
import { firstEmbed, type Embed } from "@/lib/supabase/embed";
import { buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeText } from "@/lib/i18n/catalog";
import { INTL_LOCALE } from "@/lib/i18n/config";

/**
 * One saved generation (Stage 14). Scoped to the owner by the same RLS
 * select policy the list page relies on (migration 0008, `auth.uid() =
 * user_id`) — a generation that doesn't exist and one that belongs to
 * someone else are indistinguishable here, both resolve to `null`, same
 * unified treatment as app/(guest)/tools/[slug]/page.tsx (Stage 8) uses
 * for "inactive" vs "nonexistent" tools.
 *
 * Stage 14 deliberately built no "restore into the editor" mechanism,
 * since nothing asked for one then. Stage 13's completion does — the
 * architecture doc's History spec (§9) is "list, filters, *repeat
 * parameters*", and `input_params` is stored as jsonb precisely so the
 * form can be reopened with the same values (§16). "Use these inputs
 * again" links to the tool page with `?from=<id>` (plus the template, if
 * one was used); the tool page loads the saved inputs itself, through
 * the same owner-scoped read. This page stays read-only.
 *
 * Stage 14's own note here said copy-to-clipboard was left out because it
 * needs a Client Component; the shared CopyButton (components/ui) is that
 * component now, so a saved result copies the same way a fresh one does.
 */
export default async function HistoryDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const supabase = await createClient();
  const [locale, t] = await Promise.all([getLocale(), getMessages()]);

  const { data } = await supabase
    .from("generations")
    .select("id, output, created_at, is_favorite, tools(name, slug), templates(name, slug)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return (
      <main className="p-8">
        <p className="text-ink-600">{t.history.unavailable}</p>
      </main>
    );
  }

  // Cast kept on purpose — same embed-shape normalization as the list
  // (lib/history/generations.ts) and every other embedded-select site.
  const tool = firstEmbed(data.tools as unknown as Embed<{ name: string; slug: string }>);
  const template = firstEmbed(data.templates as unknown as Embed<{ name: string; slug: string }>);

  const repeatParams = new URLSearchParams({ from: data.id });
  if (template?.slug) repeatParams.set("template", template.slug);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold text-ink-950">
            {tool?.name ? localizeText(tool.name, locale) : t.history.unknownTool}
          </h1>
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <time dateTime={data.created_at}>{new Date(data.created_at).toLocaleString(INTL_LOCALE[locale], { timeZone: "UTC" })}</time>
            {template?.name && <Badge>{localizeText(template.name, locale)}</Badge>}
          </div>
        </div>
        <FavoriteButton id={data.id} isFavorite={data.is_favorite} />
      </div>

      <p className="whitespace-pre-wrap text-sm text-ink-950">{data.output || t.common.emptyResult}</p>

      <div className="flex flex-wrap gap-3">
        {data.output && <CopyButton text={data.output} />}
        {tool?.slug && (
          <Link
            href={`/tools/${tool.slug}?${repeatParams.toString()}`}
            className={buttonClasses("secondary")}
          >
            {t.history.useAgain}
          </Link>
        )}
      </div>
    </main>
  );
}
