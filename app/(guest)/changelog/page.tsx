import { changelog } from "@/content/changelog";
import { pageMetadata } from "@/config/site";
import { formatDay } from "@/lib/format";

export const metadata = pageMetadata("Changelog", "What's new in AI Marketing Workspace.", "/changelog");

/** What changed, release by release (content/changelog.ts). */
export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">Changelog</h1>
        <p className="text-ink-600">What&apos;s new, newest first.</p>
      </header>

      {changelog.map((entry) => (
        <section key={entry.version} className="space-y-3">
          <h2 className="font-medium text-ink-950">
            {entry.version} — {entry.title}
          </h2>
          <p className="text-sm text-ink-600">{entry.date ? formatDay(entry.date) : "Launching soon"}</p>
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
