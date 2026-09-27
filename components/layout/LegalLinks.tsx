import Link from "next/link";
import { supportEmail } from "@/config/site";

/**
 * The footer of every page in AppShell, and under /login and /register
 * (outside it): help (FAQ, changelog, the support email) and the legal
 * pages. Signed in, it starts with "Send feedback" (the page needs an
 * account).
 */
export function LegalLinks({ feedback = false }: { feedback?: boolean }) {
  const links = [
    ...(feedback ? [{ href: "/feedback", label: "Send feedback" }] : []),
    { href: "/faq", label: "FAQ" },
    { href: "/changelog", label: "Changelog" },
    { href: `mailto:${supportEmail()}`, label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ];
  return (
    <p className="text-center text-xs text-ink-600">
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 && " · "}
          {link.href.startsWith("mailto:") ? (
            <a href={link.href} className="hover:underline">
              {link.label}
            </a>
          ) : (
            <Link href={link.href} className="hover:underline">
              {link.label}
            </Link>
          )}
        </span>
      ))}
    </p>
  );
}
