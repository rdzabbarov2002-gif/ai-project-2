import { legalFacts, pageMetadata, site, supportEmail } from "@/config/site";
import { getMessages } from "@/lib/i18n/server";
import { formatDay } from "@/lib/format";

export const metadata = pageMetadata(
  "Privacy Policy",
  "What AI Marketing Workspace collects, why, who processes it, and your rights.",
  "/privacy",
);

/**
 * Describes only what the app does today — keep it in step with the code:
 * a new processor, cookie or kind of stored data belongs here, and a
 * change moves `site.legalUpdated`. Who runs the service comes from the
 * environment (legalFacts); without it the page says "Draft". Have it
 * reviewed by a lawyer for your country before launch (docs/launch.md).
 */
export default async function PrivacyPage() {
  const t = await getMessages();
  const facts = legalFacts();
  const email = supportEmail();
  return (
    <main lang="en" className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      {/* The legal text is English only; other languages say so up front. */}
      {t.legal.englishOnly && (
        <p lang="ru" className="rounded-md bg-accent-subtle p-3 text-sm text-ink-950">
          {t.legal.englishOnly}
        </p>
      )}
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink-600">
          {facts.draft && "Draft · "}Last updated {formatDay(site.legalUpdated)}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Who we are</h2>
        <p className="text-ink-600">
          AI Marketing Workspace is operated by {facts.operator} (&quot;we&quot;). We are
          responsible for the personal data described here. Contact:{" "}
          <a href={`mailto:${email}`} className="text-accent underline">
            {email}
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">What we collect</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-600">
          <li>
            <strong className="text-ink-950">Account:</strong> your email address and password.
            Passwords are stored only as a secure hash by our authentication provider.
          </li>
          <li>
            <strong className="text-ink-950">Company profile:</strong> what you enter about your
            business (name, niche, audience, tone, website). If you use website autofill, we
            fetch that public web page to suggest profile details.
          </li>
          <li>
            <strong className="text-ink-950">Generations:</strong> the inputs you give each tool,
            the text generated for you, and whether you marked it as a favorite.
          </li>
          <li>
            <strong className="text-ink-950">Feedback:</strong> the messages you send us through
            the feedback form.
          </li>
          <li>
            <strong className="text-ink-950">Subscription:</strong> on a paid plan, its status,
            dates and your Stripe customer number (no card details).
          </li>
          <li>
            <strong className="text-ink-950">Usage:</strong> how many generations you made this
            month, to apply your plan&apos;s limits.
          </li>
          <li>
            <strong className="text-ink-950">Without an account:</strong> an anonymous session
            identifier stored in your browser links your generations to you. Guest sessions
            expire after 30 days. If you sign up, your guest generations move to your account.
          </li>
          <li>
            <strong className="text-ink-950">Technical data:</strong> server logs kept by our
            hosting provider, and error reports (stack traces, the page where an error happened)
            that exclude the content of your requests.
          </li>
          <li>
            <strong className="text-ink-950">Visits:</strong> when you open a page without being
            signed in, which page, the site that linked to it and any campaign tags in the link.
            Our server labels the visit with an ID it computes from your IP address and browser
            and that changes every day; the IP address itself isn&apos;t kept, and nothing is
            stored on your device. If you sign up, that day&apos;s visits are linked to your
            account.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">How we use it</h2>
        <p className="text-ink-600">
          Only to provide the service: to sign you in, generate content for you, keep your
          history, apply plan limits, send account emails (confirmation, password reset), fix
          errors and see which features people use. We don&apos;t sell your data, show ads, or use your content to train AI models.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Who processes it for us (subprocessors)</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-600">
          <li>Supabase — database and authentication.</li>
          <li>
            Vercel — hosting, and page speed measurements: how fast pages load and respond on
            your device, with the page address and device type — no cookies.
          </li>
          <li>
            Anthropic — generates the text: your tool inputs and company profile are sent to it
            for each generation.
          </li>
          <li>Sentry — error reports.</li>
          <li>
            PostHog — usage statistics: visits (above) and events such as &quot;signed up&quot;,
            &quot;generated an ad&quot; or &quot;started a subscription&quot;, tied to a random
            account, session or daily visitor ID — never your email or what you enter. Sent from
            our servers with no cookies.
          </li>
          <li>
            Stripe — payments for paid plans: your card details go straight to Stripe. We keep
            only your Stripe customer number and your subscription&apos;s status and dates.
          </li>
          <li>{facts.emailProvider} — sends account emails.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Cookies and browser storage</h2>
        <p className="text-ink-600">
          This is our cookie policy. We use only what the service needs: a cookie that keeps
          you signed in, and browser storage for the guest session and your light/dark theme.
          No analytics or advertising cookies, so there is nothing to consent to.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Your rights</h2>
        <p className="text-ink-600">
          You can see and edit your company profile at any time, and delete your account and
          its data yourself under Billing &amp; Plan → Delete account. For a copy of your
          data or any other request, contact{" "}
          <a href={`mailto:${email}`} className="text-accent underline">
            {email}
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">How long we keep it</h2>
        <p className="text-ink-600">
          For as long as your account exists. Deleting your account deletes your account,
          company profile, generations and feedback. Usage statistics, error reports and
          server logs contain no email or content and stay with the processors above for up to{" "}
          {site.statisticsRetention}.
        </p>
      </section>
    </main>
  );
}
