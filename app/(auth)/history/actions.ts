"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const FavoriteSchema = z.object({
  id: z.string().uuid(),
  favorite: z.enum(["true", "false"]),
});

/**
 * Marks a generation as a favorite (or not) — the History "favorites"
 * the architecture doc lists (§4 `generations.is_favorite`, §9 History
 * filters). Migration 0008 added the owner-scoped UPDATE policy for
 * exactly this in Stage 3, so this is a plain RLS-guarded update through
 * the user's own client; the explicit `user_id` filter is belt-and-braces
 * on top of it.
 *
 * Takes FormData so it works as a plain <form action> — the star button
 * needs no client-side JavaScript.
 */
export async function setFavorite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = FavoriteSchema.safeParse({
    id: formData.get("id"),
    favorite: formData.get("favorite"),
  });
  if (!parsed.success) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("generations")
    .update({ is_favorite: parsed.data.favorite === "true" })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("history: favorite update failed", { error });
    return;
  }

  revalidatePath("/history");
  revalidatePath(`/history/${parsed.data.id}`);
  revalidatePath("/dashboard");
}
