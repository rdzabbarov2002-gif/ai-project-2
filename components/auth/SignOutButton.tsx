"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useMessages } from "@/components/providers/LocaleProvider";

export function SignOutButton() {
  const t = useMessages();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" onClick={handleSignOut} disabled={isPending}>
      {isPending ? t.nav.signingOut : t.nav.signOut}
    </Button>
  );
}
