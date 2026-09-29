import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { listActiveTools } from "@/lib/tools/catalog";
import { listTemplates } from "@/lib/templates/catalog";
import { ToolTiles } from "@/components/landing/ToolTiles";
import { TemplateStrip } from "@/components/landing/TemplateStrip";
import { pageMetadata, site } from "@/config/site";
import { faqFacts } from "@/lib/faq-facts";
import { faq } from "@/content/faq";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeTemplate, localizeTool } from "@/lib/i18n/catalog";

/** The FAQ's questions the landing page answers too (content/faq.ts). */
const LANDING_QUESTIONS = ["account", "profile", "ai"];

// The full title on its own — no "· AI Marketing Workspace" suffix.
export const metadata = { ...pageMetadata(site.title, site.description, "/"), title: { absolute: site.title } };

function SectionHeader({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">{title}</h2>
      <Link href={href} className="text-sm font-bold text-accent hover:underline">
        {link}
      </Link>
    </div>
  );
}

/**
 * Guest-first landing (architecture doc §8: "the visitor immediately sees
 * the tools and templates", §9 "Landing / Tools Gallery"), in the app-like
 * layout of the redesign (config/design-tokens.md): a question and a
 * search box, then the tools as big tiles on the first screen of a phone,
 * templates in a row that scrolls sideways, the plans and a few answers.
 *
 * The catalog reads reuse the gallery's own functions. They're allowed to
 * fail here — the landing page must still render (with its links) if the
 * catalog is momentarily unreachable, unlike /tools, whose error boundary
 * is the right response there.
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const [user, tools, templates, facts, locale, t] = await Promise.all([
    getUser(),
    listActiveTools(supabase).catch(() => []),
    listTemplates(supabase).catch(() => []),
    faqFacts(supabase),
    getLocale(),
    getMessages(),
  ]);
  const questions = faq(facts, locale).filter((entry) => LANDING_QUESTIONS.includes(entry.id));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-4 pt-6 sm:px-6 sm:pt-10">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold text-ink-600">
          {user ? t.landing.welcomeBack : t.landing.hiThere} <span aria-hidden="true">👋</span>
        </p>
        <h1 className="mt-1 font-display text-[27px] font-extrabold leading-[1.15] tracking-tight text-ink-950 sm:text-4xl">
          {t.landing.title}
        </h1>
        <p className="mt-2 text-[15px] text-ink-600">{t.landing.lead}</p>
        <form action="/templates" role="search" className="mt-4">
          <div className="flex h-[52px] items-center gap-2.5 rounded-lg bg-surface pl-4 pr-2 shadow-sm ring-1 ring-ink-200/60 focus-within:ring-2 focus-within:ring-accent">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-600" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              name="q"
              aria-label={t.landing.searchLabel}
              placeholder={t.landing.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-base text-ink-950 placeholder:text-ink-600 focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t.landing.search}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-ink-950 text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
        {user ? (
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-bold text-accent hover:underline">
            {t.landing.toDashboard}
          </Link>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-ink-600">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
            {t.landing.freeLine(facts.guestLimit)}
          </p>
        )}
      </section>

      {tools.length > 0 && (
        <section className="mt-7">
          <SectionHeader title={t.landing.tools} href="/tools" link={t.landing.seeAll} />
          <ToolTiles tools={tools} labels={t.landing.tiles} locale={locale} />
        </section>
      )}

      {templates.length > 0 && (
        <section className="mt-7">
          <SectionHeader title={t.landing.templates} href="/templates" link={t.landing.allTemplates(templates.length)} />
          <TemplateStrip templates={templates.map((template) => localizeTemplate(template, locale))} />
        </section>
      )}

      {!user && (
        <section className="mt-7 flex items-center gap-3.5 rounded-xl bg-ink-950 p-4 text-ink-50 sm:p-5">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-ink-50/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM12 7v5l3 2" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold">{t.landing.keepTitle}</h2>
            <p className="text-[13px] text-ink-50/80">{t.landing.keepText}</p>
          </div>
          <Link
            href="/register"
            className="ml-auto shrink-0 rounded-md bg-surface px-3.5 py-2 text-sm font-extrabold text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t.nav.signUp}
          </Link>
        </section>
      )}

      <section className="mt-7">
        <SectionHeader title={t.landing.plans} href="/pricing" link={t.landing.compare} />
        <div className="grid grid-cols-2 gap-3">
          <Link href="/pricing" className="rounded-lg bg-surface p-4 shadow-sm ring-1 ring-ink-200/60">
            <h3 className="text-sm font-extrabold text-ink-600">{t.landing.free}</h3>
            <p className="mt-0.5 text-[26px] font-extrabold tracking-tight text-ink-950">$0</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-ink-600">
              {t.landing.freeAllowance(facts.freeGenerations)}
            </p>
          </Link>
          <Link href="/pricing" className="rounded-lg bg-accent p-4 text-accent-contrast shadow-sm">
            <h3 className="text-sm font-extrabold">Pro</h3>
            <p className="mt-0.5 text-[26px] font-extrabold tracking-tight">
              {typeof facts.proPrice === "number" ? (
                <>
                  ${Number(facts.proPrice)}
                  <span className="text-[13px] font-semibold">{t.landing.perMonth}</span>
                </>
              ) : (
                "Pro"
              )}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">
              {t.landing.proLine(facts.proGenerations, facts.trialDays)}
            </p>
          </Link>
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title={t.landing.questions} href="/faq" link={t.landing.all} />
        <div className="space-y-2">
          {questions.map((entry) => (
            <details key={entry.question} className="group rounded-lg bg-surface shadow-sm ring-1 ring-ink-200/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[15px] font-bold text-ink-950 [&::-webkit-details-marker]:hidden">
                {entry.question}
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-ink-600 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="px-4 pb-4 text-sm text-ink-600">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
