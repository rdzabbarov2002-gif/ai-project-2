"use server";

import { z } from "zod";
import { requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { track } from "@/lib/analytics";

const FeedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a few words first.")
    .max(2000, "Keep it under 2,000 characters."),
});

/** Per person, per hour — enough for anyone writing to us, not for a script. */
const MAX_PER_HOUR = 10;

export interface FeedbackState {
  error: string | null;
  sent: boolean;
}

/**
 * Saves a message from the in-app feedback form (Phase 5, closed beta).
 * The table is server only (migration 0022), so this is its one way in:
 * the signed-in user, a validated message, and the service role — the
 * same checks-then-admin-write shape as account deletion.
 */
export async function sendFeedback(
  _prevState: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const user = await requireUser();
  const parsed = FeedbackSchema.safeParse({ message: formData.get("message") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]!.message, sent: false };
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return { error: "That's a lot of feedback for one hour — please try again later.", sent: false };
  }

  const { error } = await admin
    .from("feedback")
    .insert({ user_id: user.id, message: parsed.data.message });
  if (error) {
    logger.error("feedback: insert failed", { error });
    return { error: "We couldn't send that. Please try again.", sent: false };
  }

  await track("feedback_sent", user.id);
  return { error: null, sent: true };
}
