import { pageMetadata } from "@/config/site";

export const metadata = pageMetadata(
  "Terms of Service",
  "The terms for using AI Marketing Workspace: accounts, plans and payment, trials, cancelling and refunds.",
  "/terms",
);

/**
 * DRAFT — to be reviewed by the owner before launch. Bracketed
 * placeholders need real values. The payment, cancellation and refund
 * terms describe what the code does (Phase 6, docs/billing.md): Stripe
 * Checkout and Customer Portal, one free trial, cancel at period end,
 * account deletion ending the subscription at once.
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
          The free plan has monthly limits shown in the app. Paid plans and their prices are on
          the pricing page and are shown again before you pay.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Payment</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-600">
          <li>
            Paid plans are monthly subscriptions, billed in advance in US dollars. Payments are
            processed by Stripe; we never see or store your card number.
          </li>
          <li>
            Tax (such as VAT or sales tax) is added where it applies, based on your address, and
            shown before you pay.
          </li>
          <li>
            A subscription renews automatically each month until you cancel it. If a payment
            fails, Stripe retries it and emails you; until it succeeds your account works as
            on the free plan.
          </li>
          <li>
            We may change prices. A new price applies from your next billing period, and we
            tell you at least [30] days before.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Free trial</h2>
        <p className="text-ink-600">
          Your first paid subscription starts with a free trial; the length is shown before you
          subscribe. We ask for a card at the start and charge it when the trial ends, unless
          you cancel before then. One trial per person.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Cancelling</h2>
        <p className="text-ink-600">
          Cancel any time under Billing &amp; Plan → Manage billing. The paid plan stays until
          the end of the period you have paid for and then isn&apos;t renewed; you&apos;re not
          charged again. Deleting your account ends a subscription immediately.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-ink-950">Refunds</h2>
        <p className="text-ink-600">
          Payments are not refunded for the rest of a period after you cancel, except where the
          law requires it. If you were charged by mistake, or [within 14 days of a first
          payment], write to [contact email] and we will refund you. Refunds go back to the card
          you paid with.
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
