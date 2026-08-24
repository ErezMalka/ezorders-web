"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Recording a yes that came in over the telephone.
 *
 * Behind a confirmation step rather than a single button, because it is not
 * undoable from inside the product: it creates an order and closes the quote.
 * The wording says plainly that this is the agent's word rather than the
 * customer's signature — an agent who wants the stronger record still has the
 * option of asking the customer to press the button on their own link, and
 * should know that is the difference.
 */
export function CloseQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "רישום האישור נכשל");
        return;
      }
      router.refresh();
    } catch {
      setError("רישום האישור נכשל — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-brand-dark">הלקוח אישר טלפונית?</h2>
        <p className="mb-3 text-xs text-brand-muted">
          רישום ידני סוגר את ההצעה ופותח הזמנה. אם אפשר — עדיף לבקש מהלקוח ללחוץ על הקישור, כדי
          שיישמר תיעוד אישור מלא.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-pill border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          רישום אישור ופתיחת הזמנה
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-emerald-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-brand-dark">רישום אישור ידני</h2>
      <p className="mb-3 text-xs text-brand-muted">
        ייפתח מספר הזמנה וההצעה תיסגר. הפעולה תירשם על שמך ולא תיראה כאישור של הלקוח.
      </p>

      <label className="block text-xs font-semibold text-brand-muted" htmlFor="accept-note">
        הערה (מי אישר, מתי)
      </label>
      <textarea
        id="accept-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="דנה, בעלים — אישרה בשיחה ב-14:20"
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
      />

      {error ? (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="flex-1 rounded-pill bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
        >
          {busy ? "רושם…" : "אישור ופתיחת הזמנה"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted"
        >
          חזרה
        </button>
      </div>
    </div>
  );
}
