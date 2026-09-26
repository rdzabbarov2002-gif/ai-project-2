"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useGuestSession } from "@/lib/guest-session/context";
import type { GuestCompanyProfileDraft } from "@/lib/guest-session/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";

/**
 * The guest's "short company profile" (architecture doc §8: a guest can
 * fill in "a short guest profile stored in guest_sessions"). Saved through
 * the existing `setProfileDraft` (lib/guest-session/context.tsx) — locally
 * and to `guest_sessions.company_profile_draft` via /api/session/draft —
 * which is what makes it reach the guest's prompts (lib/generation/
 * identity.ts) and become their first real company profile on sign-up
 * (app/api/session/merge/route.ts).
 *
 * Deliberately short — four fields of the six the full profile has; the
 * full profile is an account feature, and saying so is the "create a full
 * company profile → register" value trigger from §8. Company name is
 * required here because the merge can only create a profile row that has
 * one (`company_profiles.name` is NOT NULL).
 *
 * Uncontrolled inputs keyed on the loaded draft: the draft only arrives
 * after mount (localStorage), so the form remounts once it does instead
 * of mirroring every field in state.
 */
export function GuestProfileDraftCard() {
  const { session, setProfileDraft } = useGuestSession();
  const draft = session?.companyProfileDraft ?? null;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "local-only">("idle");
  // Collapsed until the guest opens it: the tool itself comes first
  // (architecture doc §10 — value before anything else), and the summary
  // line is the invitation. It also collapses again after a save.
  const [expanded, setExpanded] = useState(false);
  const isOpen = expanded;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: keyof GuestCompanyProfileDraft) => {
      const raw = form.get(name);
      return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined;
    };

    setStatus("saving");
    const synced = await setProfileDraft({
      // Fields this short form doesn't show are kept, not wiped.
      ...draft,
      name: value("name"),
      niche: value("niche"),
      targetAudience: value("targetAudience"),
      toneOfVoice: value("toneOfVoice"),
    });
    setStatus(synced ? "saved" : "local-only");
    setExpanded(false);
  }

  return (
    <Card>
      <details open={isOpen} onToggle={(e) => setExpanded(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-medium text-ink-950">
          {draft?.name ? `Your business: ${draft.name}` : "Tell us about your business (optional)"}
        </summary>
        <p className="mt-2 text-xs text-ink-600">
          Results get tailored to your business. Saved on this device until you sign up — then
          it becomes your company profile.
        </p>

        <form
          key={draft ? "draft" : "empty"}
          onSubmit={handleSubmit}
          className="mt-4 space-y-3"
        >
          <FieldWrapper label="Business name" required htmlFor="draft-name">
            <Input
              id="draft-name"
              name="name"
              defaultValue={draft?.name ?? ""}
              required
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="Niche / industry" htmlFor="draft-niche">
            <Input
              id="draft-niche"
              name="niche"
              defaultValue={draft?.niche ?? ""}
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="Target audience" htmlFor="draft-targetAudience">
            <Input
              id="draft-targetAudience"
              name="targetAudience"
              defaultValue={draft?.targetAudience ?? ""}
              maxLength={500}
            />
          </FieldWrapper>
          <FieldWrapper
            label="Tone of voice"
            helpText="e.g. friendly, professional, bold."
            htmlFor="draft-toneOfVoice"
          >
            <Input
              id="draft-toneOfVoice"
              name="toneOfVoice"
              defaultValue={draft?.toneOfVoice ?? ""}
              maxLength={200}
            />
          </FieldWrapper>

          <Button type="submit" variant="secondary" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-ink-600">
          Want the full profile — selling points, website, and more?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create a free account
          </Link>
          .
        </p>
      </details>

      {/* Outside <details> so it stays visible after a save collapses it. */}
      <div aria-live="polite">
        {status === "saved" && (
          <p className="mt-2 text-sm text-success">Saved — your next results will use it.</p>
        )}
        {status === "local-only" && (
          <p className="mt-2 text-sm text-danger">
            Saved on this device, but couldn&apos;t reach the server — try again shortly.
          </p>
        )}
      </div>
    </Card>
  );
}
