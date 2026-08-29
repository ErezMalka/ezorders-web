"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Sign-in runs in the browser because that is where the session cookie has to be
 * written. Everything afterwards is server-side.
 *
 * The error copy is deliberately identical for a wrong password and an unknown
 * address: distinguishing them would turn this form into a way to find out who
 * has an account.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("שם המשתמש או הסיסמה שגויים");
      setBusy(false);
      return;
    }

    // Only accept an internal destination — an open redirect here would let a
    // crafted link bounce a freshly-authenticated agent to another site.
    const next = searchParams.get("next");
    const destination = next && next.startsWith("/he/agent") ? next : "/he/agent";

    router.refresh();
    router.push(destination);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-brand-muted">
          אימייל
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          dir="ltr"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-right outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
          placeholder="name@ezorders.com"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-brand-muted">
          סיסמה
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
          placeholder="••••••••"
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
        className="w-full rounded-pill bg-brand-pinkStrong px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-pinkInk disabled:opacity-50"
      >
        {busy ? "מתחבר…" : "כניסה למערכת"}
      </button>
    </form>
  );
}
