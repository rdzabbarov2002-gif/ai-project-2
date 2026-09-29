import { createClient } from "@/lib/supabase/server";
import { faqFacts } from "@/lib/faq-facts";
import { faq } from "@/content/faq";
import { pageMetadata, site, supportEmail } from "@/config/site";
import { getLocale, getMessages } from "@/lib/i18n/server";

export const metadata = pageMetadata(
  "FAQ",
  "Trying it without an account, plans and the free trial, cancelling and refunds, your data, and how to reach us.",
  "/faq",
);

/** Questions and answers (content/faq.ts), with the numbers the app uses. */
export default async function FaqPage() {
  const [facts, locale, t] = await Promise.all([faqFacts(await createClient()), getLocale(), getMessages()]);
  const entries = faq(facts, locale);
  const email = supportEmail();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
          {t.faq.title}
        </h1>
        <p className="text-ink-600">
          {t.faq.notAnswered}{" "}
          <a href={`mailto:${email}`} className="text-accent underline">
            {email}
          </a>{" "}
          {t.faq.answerWithin(site.supportResponseHours)}
        </p>
      </header>

      {entries.map((entry) => (
        <section key={entry.id} className="space-y-2">
          <h2 className="font-medium text-ink-950">{entry.question}</h2>
          <p className="text-ink-600">{entry.answer}</p>
        </section>
      ))}
    </main>
  );
}
