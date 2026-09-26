import { Card } from "@/components/ui/Card";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

/**
 * In-app feedback (Phase 5): a message box for signed-in people — the
 * closed beta's main channel back to us. Linked from the footer of every
 * signed-in page (AppShell). Messages are read with SQL (README.md →
 * "Closed beta").
 */
export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-ink-950">Send feedback</h1>
        <p className="text-sm text-ink-600">
          Something broken, confusing or missing? Tell us — a sentence is plenty.
        </p>
      </div>
      <Card>
        <FeedbackForm />
      </Card>
    </main>
  );
}
