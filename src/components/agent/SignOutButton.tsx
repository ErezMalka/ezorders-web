"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await createSupabaseBrowserClient().auth.signOut();
    // refresh() so the server re-evaluates the session and the middleware
    // redirect takes over; a client-side push would race the cookie clear.
    router.refresh();
    router.push("/he/agent/login");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-50"
    >
      {busy ? "יוצא…" : "יציאה"}
    </button>
  );
}
