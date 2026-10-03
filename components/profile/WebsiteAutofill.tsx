"use client";

import { useId, useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";
import { autofillCompanyProfile } from "@/app/(auth)/profile/actions";
import type { SuggestedProfile } from "@/lib/profile-autofill/extractProfile";
import { useMessages } from "@/components/providers/LocaleProvider";

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
  const t = useMessages();
  const [url, setUrl] = useState(defaultUrl);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  // useId: the component appears in two different forms (wizard, /profile).
  const inputId = useId();

  function handleAutofill() {
    setMessage(null);
    startTransition(async () => {
      const result = await autofillCompanyProfile(url);
      if (result.error || !result.profile) {
        setMessage({ kind: "error", text: result.error ?? t.common.somethingWentWrong });
        return;
      }
      onFill(result.profile);
      setMessage({
        kind: "success",
        text:
          result.source === "ai" ? t.profile.filledAi : t.profile.filledBasic,
      });
    });
  }

  return (
    <div className="space-y-2">
      <FieldWrapper
        label={t.profile.yourWebsite}
        helpText={t.profile.websiteHelp}
        htmlFor={inputId}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
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
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={handleAutofill}
            disabled={isPending || url.trim() === ""}
          >
            {isPending ? t.profile.reading : t.profile.autofill}
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
