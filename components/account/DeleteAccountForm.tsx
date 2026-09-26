"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/(auth)/settings/billing/actions";

const initialState: DeleteAccountState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete account"}
    </button>
  );
}

export function DeleteAccountForm() {
  const [state, formAction] = useFormState(deleteAccount, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete your account and all your data? This can't be undone.")) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <SubmitButton />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
