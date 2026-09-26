import Link from "next/link";

/**
 * "Privacy · Terms" — the footer of every page in AppShell, and under
 * /login and /register (outside it). Signed in, it starts with "Send
 * feedback" (the page needs an account).
 */
export function LegalLinks({ feedback = false }: { feedback?: boolean }) {
  return (
    <p className="text-center text-xs text-ink-600">
      {feedback && (
        <>
          <Link href="/feedback" className="hover:underline">
            Send feedback
          </Link>
          {" · "}
        </>
      )}
      <Link href="/privacy" className="hover:underline">
        Privacy
      </Link>
      {" · "}
      <Link href="/terms" className="hover:underline">
        Terms
      </Link>
    </p>
  );
}
