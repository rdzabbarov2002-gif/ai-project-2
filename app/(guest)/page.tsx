import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { listActiveTools } from "@/lib/tools/catalog";
import { listTemplates } from "@/lib/templates/catalog";
import { deriveCategories } from "@/lib/templates/query";
import { ToolGrid } from "@/components/tools/gallery/ToolGrid";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

const STEPS = [
  {
    title: "Describe your business once",
    body: "A short company profile — or just your website — and every tool writes in your voice for your audience.",
  },
  {
    title: "Pick a tool or a template",
    body: "Ads, emails, social posts, landing pages, articles. Fill in a few fields — no prompt writing.",
  },
  {
    title: "Copy, tweak, reuse",
    body: "Copy the result straight into your channel. Your history keeps every result and its inputs.",
  },
];

/**
 * Guest-first landing (architecture doc §8: "the visitor immediately sees
 * the tools and templates", §9 "Landing / Tools Gallery"). Replaces the
 * Stage 1 scaffold page. Moved into the (guest) route group in Stage 14 so
 * it shares the guest navigation; the URL is still `/`.
 *
 * The catalog reads reuse the gallery's own functions. They're allowed to
 * fail here — the landing page must still render (with its links) if the
 * catalog is momentarily unreachable, unlike /tools, whose error boundary
 * is the right response there.
 */
export default async function LandingPage() {
  const supabase = createClient();
  const [user, tools, templates] = await Promise.all([
    getUser(),
    listActiveTools(supabase).catch(() => []),
    listTemplates(supabase).catch(() => []),
  ]);
  const categories = deriveCategories(templates);

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:px-6">
      <section className="max-w-2xl space-y-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Marketing copy for your business, in seconds.
        </h1>
        <p className="text-lg text-ink-600">
          Ads, emails, social posts and more — tailored to your company, without writing prompts.
          Try any tool right now, no sign-up needed.
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link href="/dashboard" className={buttonClasses("primary")}>
              Go to your dashboard
            </Link>
          ) : (
            <Link href="/tools" className={buttonClasses("primary")}>
              Try a tool — free
            </Link>
          )}
          <Link href="/templates" className={buttonClasses("secondary")}>
            Browse templates
          </Link>
        </div>
      </section>

      {tools.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink-950">Tools</h2>
            <Link href="/tools" className="text-sm text-accent hover:underline">
              All tools →
            </Link>
          </div>
          <ToolGrid tools={tools} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink-950">How it works</h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="space-y-2 rounded-lg border border-ink-200 bg-surface p-4">
              <span className="text-sm font-medium text-accent">Step {index + 1}</span>
              <h3 className="font-medium text-ink-950">{step.title}</h3>
              <p className="text-sm text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {templates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {templates.length} ready-made templates
            </h2>
            <Link href="/templates" className="text-sm text-accent hover:underline">
              Template library →
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Template categories">
            {categories.map((category) => (
              <li key={category}>
                <Badge tone="neutral">{category}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!user && (
        <section className="space-y-3 rounded-lg border border-ink-200 bg-surface p-6 text-center">
          <h2 className="font-display text-xl font-semibold text-ink-950">Keep what you create</h2>
          <p className="text-ink-600">
            A free account saves your results, your company profile and a monthly allowance — and
            everything you made as a guest carries over.
          </p>
          <Link href="/register" className={buttonClasses("primary")}>
            Create a free account
          </Link>
        </section>
      )}
    </main>
  );
}
