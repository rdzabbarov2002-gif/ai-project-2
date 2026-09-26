/** Same inline pattern as the Dashboard/History/Billing loading states
 *  (Stage 13/14) — /profile was the one (auth) page without one (Stage 15
 *  audit §1.10). */
export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-md border border-ink-200 p-8 text-center text-sm text-ink-600">
        Loading your company profile…
      </div>
    </main>
  );
}
