/**
 * DRAFT — to be reviewed by the owner before launch. Describes only what
 * the app does today; bracketed placeholders need real values. Keep it in
 * step with the code: a new processor, cookie or kind of stored data
 * belongs here.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink-600">Draft · Last updated September 26, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Who we are</h2>
        <p className="text-ink-600">
          AI Marketing Workspace is operated by [Company name] (&quot;we&quot;). We are
          responsible for the personal data described here. Contact: [contact email].
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
        <h2 className="font-medium text-ink-950">Who processes it for us</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-600">
          <li>Supabase — database and authentication.</li>
          <li>Vercel — hosting.</li>
          <li>
            Anthropic — generates the text: your tool inputs and company profile are sent to it
            for each generation.
          </li>
          <li>Sentry — error reports.</li>
          <li>
            PostHog — usage statistics (for example, which tools are used), sent from our
            servers with no cookies.
          </li>
          <li>[Email provider] — sends account emails.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Cookies and browser storage</h2>
        <p className="text-ink-600">
          We use only what the service needs: a cookie that keeps you signed in, and browser
          storage for the guest session and your light/dark theme. No analytics or advertising
          cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Your rights</h2>
        <p className="text-ink-600">
          You can see and edit your company profile at any time, and delete your account and
          all its data yourself under Billing &amp; Plan → Delete account. For a copy of your
          data or any other request, contact [contact email].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">How long we keep it</h2>
        <p className="text-ink-600">
          For as long as your account exists. Deleting your account deletes your data.
        </p>
      </section>
    </main>
  );
}
