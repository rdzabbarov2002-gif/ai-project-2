import Link from "next/link";

/** "Privacy · Terms" — shown under the landing page, /login and /register. */
export function LegalLinks() {
  return (
    <p className="text-center text-xs text-ink-600">
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
