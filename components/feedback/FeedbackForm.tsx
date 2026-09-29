"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendFeedback, type FeedbackState } from "@/app/(auth)/feedback/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useMessages } from "@/components/providers/LocaleProvider";

const initialState: FeedbackState = { error: null, sent: false };

function SubmitButton() {
  const t = useMessages();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t.common.sending : t.feedback.send}
    </Button>
  );
}

export function FeedbackForm() {
  const t = useMessages();
  const [state, formAction] = useActionState(sendFeedback, initialState);

  if (state.sent) {
    return (
      <p role="status" className="text-sm text-ink-950">
        {t.feedback.thanks}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="feedback-message" className="block text-sm font-medium text-ink-950">
        {t.feedback.label}
      </label>
      <Textarea
        id="feedback-message"
        name="message"
        rows={6}
        required
        maxLength={2000}
        placeholder={t.feedback.placeholder}
        defaultValue={state.message}
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
