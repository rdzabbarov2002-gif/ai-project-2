"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";
import { saveCompanyProfile, type CompanyProfileFormState } from "@/app/(auth)/profile/actions";
import { WebsiteAutofill } from "./WebsiteAutofill";
import { useMessages } from "@/components/providers/LocaleProvider";
import type { SuggestedProfile } from "@/lib/profile-autofill/extractProfile";

/**
 * Shape matches GuestCompanyProfileDraft (lib/guest-session/types.ts) —
 * the same six fields, same names — plus `id`, which a guest draft never
 * has. Not imported directly: that type lives in lib/guest-session/ and
 * carries no `id` field, and importing it here just to widen it locally
 * would read stranger than declaring the six fields this form actually
 * has, with the one field guest drafts don't. The shape is intentionally
 * kept identical on purpose (see actions.ts) even though the interface
 * itself isn't shared.
 */
export interface CompanyProfileFormValues {
  id: string;
  name: string;
  niche: string;
  toneOfVoice: string;
  targetAudience: string;
  usp: string;
  websiteUrl: string;
}

const initialState: CompanyProfileFormState = { error: null, success: false };

function SubmitButton() {
  const t = useMessages();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t.common.saving : t.common.save}
    </Button>
  );
}

/**
 * Uncontrolled form (name + defaultValue, not value + onChange) submitted
 * via a Server Action — same interaction pattern as Stage 2's login/register
 * forms, not Stage 6's ToolRunner (which is controlled because it has to
 * validate a dynamic, DB-driven field set client-side before submit; this
 * form's field set is fixed and known at compile time, so it doesn't need
 * that machinery). Reuses FieldWrapper (Stage 6) for label/required/error
 * chrome — that component was already fully generic (no dependency on the
 * tool-config field system beyond the props it takes), so nothing about
 * it needed to change to fit here, unlike SearchBar in Stage 10.
 *
 * Stage 12 completion — autofill by URL: WebsiteAutofill's suggestions
 * are applied by remounting the (still uncontrolled) form with them as
 * new defaults (`formKey`), merged over whatever is currently typed in,
 * so a half-edited form doesn't lose manual changes to fields the
 * website said nothing about. Nothing is saved until Save.
 *
 * Save does the same with what was typed: React (19) resets a form's
 * fields to their defaults once its action has run, so without it an
 * error — or a save — would put back the values the page loaded with.
 */
type EditableField = Exclude<keyof CompanyProfileFormValues, "id">;
const EDITABLE_FIELDS: EditableField[] = [
  "name",
  "niche",
  "toneOfVoice",
  "targetAudience",
  "usp",
  "websiteUrl",
];

export function CompanyProfileForm({
  initialProfile,
}: {
  initialProfile: CompanyProfileFormValues | null;
}) {
  const t = useMessages();
  const [state, formAction] = useActionState(saveCompanyProfile, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [overrides, setOverrides] = useState<Partial<Record<EditableField, string>>>({});

  const valueOf = (name: EditableField) => overrides[name] ?? initialProfile?.[name] ?? "";

  /** What the form holds right now, field by field. */
  function typedValues() {
    const current = formRef.current ? new FormData(formRef.current) : null;
    const values: Partial<Record<EditableField, string>> = {};
    for (const name of EDITABLE_FIELDS) {
      const typed = current?.get(name);
      values[name] = typeof typed === "string" ? typed : valueOf(name);
    }
    return values;
  }

  function applySuggestions(suggested: SuggestedProfile) {
    const typed = typedValues();
    const next: Partial<Record<EditableField, string>> = {};
    for (const name of EDITABLE_FIELDS) {
      next[name] = suggested[name] || typed[name];
    }
    setOverrides(next);
    setFormKey((key) => key + 1);
  }

  return (
    <Card className="space-y-6">
      <WebsiteAutofill defaultUrl={initialProfile?.websiteUrl ?? ""} onFill={applySuggestions} />

      <form
        key={formKey}
        ref={formRef}
        action={formAction}
        onSubmit={() => setOverrides(typedValues())}
        className="space-y-4"
      >
        {initialProfile?.id && <input type="hidden" name="id" value={initialProfile.id} />}

        <FieldWrapper label={t.profile.companyName} required htmlFor="profile-name">
          <Input
            id="profile-name"
            name="name"
            defaultValue={valueOf("name")}
            required
            maxLength={200}
          />
        </FieldWrapper>

        <FieldWrapper label={t.profile.niche} htmlFor="profile-niche">
          <Input id="profile-niche" name="niche" defaultValue={valueOf("niche")} maxLength={200} />
        </FieldWrapper>

        <FieldWrapper
          label={t.profile.tone}
          helpText={t.profile.toneHelp}
          htmlFor="profile-toneOfVoice"
        >
          <Input
            id="profile-toneOfVoice"
            name="toneOfVoice"
            defaultValue={valueOf("toneOfVoice")}
            maxLength={200}
          />
        </FieldWrapper>

        <FieldWrapper label={t.profile.audience} htmlFor="profile-targetAudience">
          <Textarea
            id="profile-targetAudience"
            name="targetAudience"
            defaultValue={valueOf("targetAudience")}
            maxLength={500}
            rows={3}
          />
        </FieldWrapper>

        <FieldWrapper label={t.profile.usp} htmlFor="profile-usp">
          <Textarea
            id="profile-usp"
            name="usp"
            defaultValue={valueOf("usp")}
            maxLength={500}
            rows={3}
          />
        </FieldWrapper>

        <FieldWrapper label={t.profile.website} htmlFor="profile-websiteUrl">
          <Input
            id="profile-websiteUrl"
            name="websiteUrl"
            defaultValue={valueOf("websiteUrl")}
            maxLength={300}
          />
        </FieldWrapper>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-success">{t.common.saved}</p>}

        <SubmitButton />
      </form>
    </Card>
  );
}
