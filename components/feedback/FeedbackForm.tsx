"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendFeedback, type FeedbackState } from "@/app/(auth)/feedback/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

const initialState: FeedbackState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send feedback"}
    </Button>
  );
}

export function FeedbackForm() {
  const [state, formAction] = useActionState(sendFeedback, initialState);

  if (state.sent) {
    return (
      <p role="status" className="text-sm text-ink-950">
        Thank you — your message reached us. We read every one.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="feedback-message" className="block text-sm font-medium text-ink-950">
        Your message
      </label>
      <Textarea
        id="feedback-message"
        name="message"
        rows={6}
        required
        maxLength={2000}
        placeholder="What worked, what didn't, what you'd like to see…"
        defaultValue={state.message}
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
