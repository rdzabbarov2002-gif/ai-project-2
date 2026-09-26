/**
 * DRAFT — to be reviewed by the owner before launch. Bracketed
 * placeholders need real values. Paid plans get their payment,
 * cancellation and refund terms when billing is added.
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
          Terms of Service
        </h1>
        <p className="text-sm text-ink-600">Draft · Last updated September 26, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">The service</h2>
        <p className="text-ink-600">
          AI Marketing Workspace, operated by [Company name], generates marketing copy with AI
          based on the information you provide. By using it you agree to these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Your account</h2>
        <p className="text-ink-600">
          Give a valid email address and keep your password to yourself — you are responsible
          for what happens under your account. You can delete your account at any time under
          Billing &amp; Plan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Acceptable use</h2>
        <p className="text-ink-600">
          Don&apos;t use the service for anything illegal, to create deceptive, hateful or
          harmful content, to infringe anyone&apos;s rights, or to get around plan limits or
          overload the service. We may suspend accounts that do.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Generated content</h2>
        <p className="text-ink-600">
          The text you generate is yours to use. AI output can be inaccurate or unsuitable —
          review it before you publish it; you are responsible for how you use it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Plans</h2>
        <p className="text-ink-600">
          The free plan has monthly limits shown in the app. Paid plans, when available, will
          have their price and terms shown before you subscribe.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">No warranty, limited liability</h2>
        <p className="text-ink-600">
          The service is provided &quot;as is&quot;, without guarantees that it will be
          uninterrupted or error-free. To the extent the law allows, we are not liable for
          indirect or consequential losses arising from its use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Changes and contact</h2>
        <p className="text-ink-600">
          We may update these terms; the date above shows the latest version. These terms are
          governed by the laws of [country]. Questions: [contact email].
        </p>
      </section>
    </main>
  );
}
