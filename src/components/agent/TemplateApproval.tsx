"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The interlock, as a screen.
 *
 * Approving is a separate act from writing, and this is the only place it
 * happens. Until someone presses it, create_contract_from_quote returns
 * 'no_approved_template' and no customer can be asked to sign anything.
 *
 * The confirmation is deliberate friction. This is the one button in the portal
 * whose meaning is "I have read this and it is what we send people", and a
 * button like that should not be pressable by accident.
 */
export function TemplateApproval({ version, approved }: { version: number; approved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (approved) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        גרסה {version} מאושרת. אפשר להפיק ממנה הסכמים.
      </p>
    );
  }

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/contract-template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "האישור נכשל");
        return;
      }
      router.refresh();
    } catch {
      setError("האישור נכשל — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">גרסה {version} לא מאושרת</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
        עד שהנוסח מאושר המערכת מסרבת להפיק הסכמים ממנו. עברו על הנוסח מול המקור, ורק אז אשרו.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="mt-4 rounded-xl bg-white px-4 py-3">
          <p className="text-sm font-medium text-brand-dark">
            אתם מאשרים שקראתם את הנוסח במלואו ושזה הנוסח שנשלח ללקוחות לחתימה?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={approve}
              className="rounded-pill bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:opacity-40"
            >
              {busy ? "מאשר…" : "כן, קראתי ואני מאשר"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-pill border border-slate-200 px-6 py-2.5 text-sm font-semibold text-brand-muted"
            >
              עוד לא
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-pill bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white"
        >
          אישור הנוסח
        </button>
      )}
    </div>
  );
}
