"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";
import { autofillCompanyProfile } from "@/app/(auth)/profile/actions";
import type { SuggestedProfile } from "@/lib/profile-autofill/extractProfile";

/**
 * "Autofill from website" (Stage 12), shared by the onboarding wizard and
 * the /profile form so the interaction exists once. Calls the
 * autofillCompanyProfile server action and hands the suggestions to the
 * parent form via `onFill` — it never saves anything itself.
 *
 * Its input deliberately has no `name`: it sits inside the parent's
 * <form>, and the website URL that actually gets saved is the parent's
 * own `websiteUrl` field (which `onFill` fills in).
 */
export function WebsiteAutofill({
  defaultUrl = "",
  onFill,
}: {
  defaultUrl?: string;
  onFill: (profile: SuggestedProfile) => void;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAutofill() {
    setMessage(null);
    startTransition(async () => {
      const result = await autofillCompanyProfile(url);
      if (result.error || !result.profile) {
        setMessage({ kind: "error", text: result.error ?? "Something went wrong. Please try again." });
        return;
      }
      onFill(result.profile);
      setMessage({
        kind: "success",
        text:
          result.source === "ai"
            ? "Filled in from your website — review everything before saving."
            : "We could only read the basics from your website — please fill in the rest.",
      });
    });
  }

  return (
    <div className="space-y-2">
      <FieldWrapper
        label="Your website"
        helpText="We'll read your homepage and suggest a profile — you can edit everything."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            // text, not "url": native URL validation would reject a bare
            // "example.com" and, since this sits inside the parent form,
            // block that form's submit too. fetchWebsite.ts normalizes it.
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              // Enter would submit the surrounding profile form instead.
              if (e.key === "Enter") {
                e.preventDefault();
                handleAutofill();
              }
            }}
            placeholder="example.com"
            maxLength={300}
            aria-label="Website to autofill from"
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={handleAutofill}
            disabled={isPending || url.trim() === ""}
          >
            {isPending ? "Reading your website…" : "Autofill from website"}
          </Button>
        </div>
      </FieldWrapper>
      <div aria-live="polite">
        {message && (
          <p className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
