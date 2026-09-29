"use client";

import Link from "next/link";
import { supportEmail } from "@/config/site";
import { useMessages } from "@/components/providers/LocaleProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * The footer of every page in AppShell, and under /login and /register
 * (outside it): help (FAQ, changelog, the support email) and the legal
 * pages. Signed in, it starts with "Send feedback" (the page needs an
 * account).
 */
export function LegalLinks({ feedback = false, language = false }: { feedback?: boolean; language?: boolean }) {
  const t = useMessages();
  const links = [
    ...(feedback ? [{ href: "/feedback", label: t.footer.feedback }] : []),
    { href: "/faq", label: t.footer.faq },
    { href: "/changelog", label: t.footer.changelog },
    { href: `mailto:${supportEmail()}`, label: t.footer.contact },
    { href: "/privacy", label: t.footer.privacy },
    { href: "/terms", label: t.footer.terms },
  ];
  const list = (
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
  // Pages without a header (sign-in, sign-up) offer the language here.
  return language ? (
    <div className="flex flex-col items-center gap-2">
      <LanguageSwitcher />
      {list}
    </div>
  ) : (
    list
  );
}
