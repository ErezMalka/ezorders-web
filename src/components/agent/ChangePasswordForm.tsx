"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_LENGTH = 10;

/**
 * Change your own password.
 *
 * The update goes to Supabase Auth from the browser, because the session there
 * is the only thing that proves this request owns the account. Only once Auth
 * has accepted it does the server clear the must-change flag — in that order,
 * so a failed update never leaves an agent free of the requirement with the old
 * password still live.
 */
export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`הסיסמה חייבת להכיל לפחות ${MIN_LENGTH} תווים`);
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError("החלפת הסיסמה נכשלה. נסה שוב.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/agent/password", { method: "POST" });
    if (!response.ok) {
      // The password DID change; only the flag did not. Say so plainly rather
      // than implying the whole thing failed and inviting a second change.
      setError("הסיסמה הוחלפה, אך העדכון במערכת נכשל. רענן את הדף.");
      setBusy(false);
      return;
    }

    router.refresh();
    router.push("/he/agent");
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-brand-muted">
          סיסמה חדשה
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
          placeholder="לפחות 10 תווים"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-brand-muted">
          אישור סיסמה
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
        />
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-pill bg-brand-pink px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:opacity-50"
      >
        {busy ? "מעדכן…" : forced ? "שמור והמשך" : "שמור סיסמה"}
      </button>
    </form>
  );
}
