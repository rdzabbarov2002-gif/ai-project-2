"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";
import { saveCompanyProfile, type CompanyProfileFormState } from "@/app/(auth)/profile/actions";

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
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
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
 */
export function CompanyProfileForm({
  initialProfile,
}: {
  initialProfile: CompanyProfileFormValues | null;
}) {
  const [state, formAction] = useFormState(saveCompanyProfile, initialState);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        {initialProfile?.id && <input type="hidden" name="id" value={initialProfile.id} />}

        <FieldWrapper label="Company name" required>
          <Input name="name" defaultValue={initialProfile?.name ?? ""} required maxLength={200} />
        </FieldWrapper>

        <FieldWrapper label="Niche / industry">
          <Input name="niche" defaultValue={initialProfile?.niche ?? ""} maxLength={200} />
        </FieldWrapper>

        <FieldWrapper label="Tone of voice" helpText="e.g. friendly, professional, bold.">
          <Input name="toneOfVoice" defaultValue={initialProfile?.toneOfVoice ?? ""} maxLength={200} />
        </FieldWrapper>

        <FieldWrapper label="Target audience">
          <Textarea
            name="targetAudience"
            defaultValue={initialProfile?.targetAudience ?? ""}
            maxLength={500}
            rows={3}
          />
        </FieldWrapper>

        <FieldWrapper label="Unique selling point">
          <Textarea name="usp" defaultValue={initialProfile?.usp ?? ""} maxLength={500} rows={3} />
        </FieldWrapper>

        <FieldWrapper label="Website URL">
          <Input name="websiteUrl" defaultValue={initialProfile?.websiteUrl ?? ""} maxLength={300} />
        </FieldWrapper>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-success">Saved.</p>}

        <SubmitButton />
      </form>
    </Card>
  );
}
