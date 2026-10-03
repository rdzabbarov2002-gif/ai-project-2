import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { resolveTool, resolveTemplate, resolveDefaultTemplate } from "@/lib/generation/catalog";
import { resolvePlanLimits } from "@/lib/generation/plan";
import { resolveUsageSummary } from "@/lib/limits/usageSummary";
import { parseToolConfigSchema } from "@/lib/tool-config/validate";
import { ToolRunner } from "@/components/tools/ToolRunner";
import { PremiumTemplateNotice } from "@/components/templates/PremiumTemplateNotice";
import { GuestProfileDraftCard } from "@/components/profile/GuestProfileDraftCard";
import { appSettings } from "@/config/settings";
import { pageMetadata, site } from "@/config/site";
import { listActiveTools } from "@/lib/tools/catalog";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeSchema, localizeText } from "@/lib/i18n/catalog";

/** The tool's name and description in search results and link previews. */
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tools = await listActiveTools(await createClient()).catch(() => []);
  const tool = tools.find((candidate) => candidate.slug === slug);
  if (!tool) return {};
  return pageMetadata(tool.name, tool.description ?? site.description, `/tools/${slug}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reuses Stage 5's `resolveTool` (lib/generation/catalog.ts) rather than
 * re-querying `tools` here — same lookup /api/generate already relies on,
 * including the property this page depends on just as much: an inactive
 * tool and a nonexistent slug resolve identically (both `null`), because
 * the `tools` RLS policy already filters to `is_active = true`. One
 * lookup implementation, two callers.
 *
 * Template resolution (Stage 8, extended Stage 10): an explicit
 * `?template=` query param — as the Templates Library's TemplateCard now
 * links with — takes a specific template via `resolveTemplate`, the same
 * function /api/generate already uses; with no param, this falls back to
 * `resolveDefaultTemplate` exactly as it did before Stage 10 existed. An
 * invalid/stale `?template=` (wrong tool, deleted template) resolves to
 * `null` rather than silently substituting the default — a broken link
 * degrades to the tool's generic no-template prompt (ToolRunner's
 * existing, Stage 5-established fallback), not to different content than
 * what the link implied.
 *
 * Stage 10 completion: the form comes from the template when it has its
 * own `config_schema` (a Facebook-specific ad doesn't ask for a platform),
 * otherwise from the tool — architecture doc §12's "config_schema of the
 * tool or template". A premium template on a plan without
 * `premium_templates` shows an explanation instead of a form; the plan
 * lookup only happens in that case, so ordinary tool pages cost no extra
 * queries. /api/generate enforces the same rule regardless.
 *
 * Stage 11: signed out = guest, decided here once (`getUser()`, the same
 * check every (auth) page uses) and handed down — guests get the short
 * profile-draft card and ToolRunner's sign-up prompts. Presentation only;
 * the API resolves identity for itself.
 *
 * Stage 13 completion: a signed-in visitor sees how many generations are
 * left before generating (architecture doc §10 — limits shown
 * proactively, not only at the moment of refusal), and `?from=<id>`
 * (History's "Use these inputs again") pre-fills the form from one of
 * their own saved generations — read through the owner-scoped RLS select
 * policy, and only when it belongs to this tool.
 */
export default async function ToolPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ template?: string; from?: string }>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const supabase = await createClient();
  const [tool, locale, t] = await Promise.all([resolveTool(supabase, params.slug), getLocale(), getMessages()]);

  if (!tool) {
    return (
      <main className="p-8">
        <p className="text-ink-600">{t.tools.unavailable}</p>
      </main>
    );
  }
  // What people read, in their language (lib/i18n/catalog.ts); the form's
  // names and values — what the request sends — stay as they are.
  const toolName = localizeText(tool.name, locale);

  // Independent lookups — run together so the auth check adds no latency.
  const [template, user] = await Promise.all([
    searchParams.template
      ? resolveTemplate(supabase, searchParams.template, tool.id)
      : resolveDefaultTemplate(supabase, tool.id),
    getUser(),
  ]);
  const schema = localizeSchema(parseToolConfigSchema(template?.configSchema ?? tool.configSchema), locale);
  const templateName = template ? localizeText(template.name, locale) : null;
  const isGuest = !user;

  const fromId = searchParams.from && UUID.test(searchParams.from) ? searchParams.from : null;
  const [usage, previous] = await Promise.all([
    user ? resolveUsageSummary(supabase, user.id) : null,
    user && fromId
      ? supabase
          .from("generations")
          .select("input_params, tool_id")
          .eq("id", fromId)
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) =>
            // Always an object — written by lib/generation/save.ts.
            data && data.tool_id === tool.id ? (data.input_params as Record<string, unknown>) : null,
          )
      : null,
  ]);

  let premiumLocked = false;
  if (template?.isPremium) {
    // A signed-in visitor's plan already came with the usage summary.
    const planLimits = usage?.planLimits ?? (await resolvePlanLimits(supabase, { type: "guest" }));
    premiumLocked = !planLimits.premiumTemplates;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-ink-950">{toolName}</h1>
        {template && searchParams.template && (
          <p className="text-sm text-ink-600">{t.tools.template(templateName ?? template.name)}</p>
        )}
        {usage && usage.remaining !== null && (
          <p className={usage.remaining <= 2 ? "text-sm text-danger" : "text-sm text-ink-600"}>
            {t.tools.left(usage.remaining, usage.planLimits.maxGenerationsPerMonth)}{" "}
            {usage.remaining <= 2 && (
              <Link href="/settings/billing" className="text-accent underline">
                {t.tools.seePlans}
              </Link>
            )}
          </p>
        )}
      </div>
      {template && premiumLocked ? (
        <div className="max-w-2xl">
          <PremiumTemplateNotice toolSlug={tool.slug} templateName={templateName ?? template.name} />
        </div>
      ) : (
        <>
          {isGuest && (
            <div className="max-w-2xl">
              <GuestProfileDraftCard />
            </div>
          )}
          <ToolRunner
            tool={{ slug: tool.slug, name: toolName }}
            templateSlug={template?.slug}
            schema={schema}
            isGuest={isGuest}
            guestGenerationLimit={appSettings.guestGenerationLimit}
            initialValues={previous ?? undefined}
          />
        </>
      )}
    </main>
  );
}
