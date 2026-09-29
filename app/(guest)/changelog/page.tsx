import { changelog } from "@/content/changelog";
import { pageMetadata } from "@/config/site";
import { formatDay } from "@/lib/format";
import { getLocale, getMessages } from "@/lib/i18n/server";

export const metadata = pageMetadata("Changelog", "What's new in AI Marketing Workspace.", "/changelog");

/** What changed, release by release (content/changelog.ts). */
export default async function ChangelogPage() {
  const [locale, t] = await Promise.all([getLocale(), getMessages()]);
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">{t.changelog.title}</h1>
        <p className="text-ink-600">{t.changelog.lead}</p>
        {t.changelog.englishOnly && <p className="text-sm text-ink-600">{t.changelog.englishOnly}</p>}
      </header>

      {changelog.map((entry) => (
        <section key={entry.version} lang="en" className="space-y-3">
          <h2 className="font-medium text-ink-950">
            {entry.version} — {entry.title}
          </h2>
          <p className="text-sm text-ink-600">{entry.date ? formatDay(entry.date, locale) : t.changelog.soon}</p>
          <ul className="list-disc space-y-2 pl-5 text-ink-600">
            {entry.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
