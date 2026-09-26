"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldWrapper } from "@/components/tools/fields/FieldWrapper";
import { saveCompanyProfile, type CompanyProfileFormState } from "@/app/(auth)/profile/actions";
import type { SuggestedProfile } from "@/lib/profile-autofill/extractProfile";
import { WebsiteAutofill } from "./WebsiteAutofill";

/**
 * Onboarding wizard (Stage 12, architecture doc §8/§12: "Onboarding (if
 * the profile is still a draft) → Dashboard"). Three short steps over the
 * same six fields the /profile form edits, saved through the same
 * saveCompanyProfile Server Action — a guided first pass at the profile,
 * not a second way to store one.
 *
 * One <form> across all steps: the steps not currently shown are `hidden`
 * but their inputs stay mounted, so the final submit carries every field.
 * Controlled inputs here (unlike the /profile form) because the website
 * step's autofill fills fields on steps the person hasn't reached yet.
 * The only required field (name) is checked before leaving its step, so a
 * hidden required input can never silently block the final submit.
 */

type Values = Required<Omit<SuggestedProfile, "websiteUrl">> & { websiteUrl: string };

const EMPTY: Values = {
  name: "",
  niche: "",
  targetAudience: "",
  toneOfVoice: "",
  usp: "",
  websiteUrl: "",
};

const STEPS = ["Website", "Your business", "Audience & voice"] as const;

const initialState: CompanyProfileFormState = { error: null, success: false };

function FinishButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Finish"}
    </Button>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [state, formAction] = useFormState(saveCompanyProfile, initialState);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state.success, router]);

  const set = (name: keyof Values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [name]: event.target.value }));

  function applySuggestions(suggested: SuggestedProfile) {
    setValues((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(EMPTY) as (keyof Values)[]) {
        const value = suggested[key];
        if (value) next[key] = value;
      }
      return next;
    });
    setStep(1);
  }

  function goNext() {
    if (step === 1 && values.name.trim() === "") {
      setStepError("Please enter your company name.");
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  return (
    <Card className="space-y-6">
      <ol className="flex gap-2 text-xs" aria-label="Onboarding progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={
              index === step
                ? "rounded-sm bg-accent-subtle px-2 py-1 font-medium text-accent"
                : "px-2 py-1 text-ink-600"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <form action={formAction} className="space-y-4">
        <section hidden={step !== 0} className="space-y-4">
          <p className="text-sm text-ink-600">
            Start from your website and we&apos;ll suggest the rest — or skip this and fill it in
            yourself.
          </p>
          <WebsiteAutofill onFill={applySuggestions} />
        </section>

        <section hidden={step !== 1} className="space-y-4">
          <FieldWrapper label="Company name" required htmlFor="onboarding-name">
            <Input
              id="onboarding-name"
              name="name"
              value={values.name}
              onChange={set("name")}
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="Niche / industry" htmlFor="onboarding-niche">
            <Input
              id="onboarding-niche"
              name="niche"
              value={values.niche}
              onChange={set("niche")}
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="Website URL" htmlFor="onboarding-websiteUrl">
            <Input
              id="onboarding-websiteUrl"
              name="websiteUrl"
              value={values.websiteUrl}
              onChange={set("websiteUrl")}
              maxLength={300}
            />
          </FieldWrapper>
        </section>

        <section hidden={step !== 2} className="space-y-4">
          <FieldWrapper label="Target audience" htmlFor="onboarding-targetAudience">
            <Textarea
              id="onboarding-targetAudience"
              name="targetAudience"
              value={values.targetAudience}
              onChange={set("targetAudience")}
              maxLength={500}
              rows={3}
            />
          </FieldWrapper>
          <FieldWrapper
            label="Tone of voice"
            helpText="e.g. friendly, professional, bold."
            htmlFor="onboarding-toneOfVoice"
          >
            <Input
              id="onboarding-toneOfVoice"
              name="toneOfVoice"
              value={values.toneOfVoice}
              onChange={set("toneOfVoice")}
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="Unique selling point" htmlFor="onboarding-usp">
            <Textarea
              id="onboarding-usp"
              name="usp"
              value={values.usp}
              onChange={set("usp")}
              maxLength={500}
              rows={3}
            />
          </FieldWrapper>
        </section>

        {(stepError ?? state.error) && (
          <p className="text-sm text-danger">{stepError ?? state.error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              {step === 0 ? "Skip — I'll fill it in" : "Next"}
            </Button>
          ) : (
            <FinishButton />
          )}
        </div>
      </form>
    </Card>
  );
}
