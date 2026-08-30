"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fmt } from "@/lib/pricing";
import type { ContractLineRow, ContractStatus } from "@/lib/agent/contracts";

/**
 * The agent's notes: one per line, and one on the deal.
 *
 * Everything else on a contract is generated — the terms from an approved
 * template, the numbers from the quote. This is the only text an agent writes,
 * so it is the only thing on this page with a save button, and the button says
 * plainly what saving does: it changes the document the customer is reading.
 *
 * Locked the moment there is a signature. Not greyed out and quietly ignored —
 * the fields disappear and what was signed is shown as text, because a form you
 * can type into but not save is a form that lies.
 *
 * Typed and not saved is the failure this page kept having: every contract so
 * far was created and sent inside ten seconds, with the notes still empty. So
 * the state of this form is reported upwards — the send button refuses to fire
 * while there is unsaved text here, and the browser asks before the tab closes
 * on it.
 */
export function ContractNotes({
  id,
  status,
  lines,
  initialNotes,
  initialItemNotes,
  quoteNotes,
  onDirtyChange,
  onNotesPresenceChange,
}: {
  id: string;
  status: ContractStatus;
  lines: ContractLineRow[];
  initialNotes: string;
  initialItemNotes: Record<string, string>;
  /** What the agent wrote on the quote. Offered, never copied silently. */
  quoteNotes?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
  onNotesPresenceChange?: (hasNotes: boolean) => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(initialItemNotes);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = status === "signed" || status === "cancelled";
  const live = status === "sent" || status === "viewed";

  const dirty =
    notes !== initialNotes ||
    lines.some((line) => (itemNotes[line.component_key] ?? "") !== (initialItemNotes[line.component_key] ?? ""));

  const hasSavedNotes =
    Boolean(initialNotes.trim()) ||
    lines.some((line) => Boolean((initialItemNotes[line.component_key] ?? "").trim()));

  // The page above needs both of these to decide whether the send button may
  // fire. Reported rather than recomputed there: this component is the only
  // place that knows what is in the fields right now.
  useEffect(() => {
    onDirtyChange?.(locked ? false : dirty);
  }, [dirty, locked, onDirtyChange]);

  useEffect(() => {
    onNotesPresenceChange?.(hasSavedNotes);
  }, [hasSavedNotes, onNotesPresenceChange]);

  // A note typed into a textarea and never saved is not in the document, and
  // closing the tab is the commonest way to lose one.
  useEffect(() => {
    if (locked || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, locked]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/agent/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notes", notes, itemNotes }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "השמירה נכשלה");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("השמירה נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  const appendQuoteNotes = () => {
    const text = (quoteNotes ?? "").trim();
    if (!text) return;
    setNotes((current) => {
      if (current.includes(text)) return current;
      const joined = current.trim() ? `${current.trim()}\n${text}` : text;
      return joined.slice(0, 4000);
    });
  };

  if (locked) {
    const written = lines.filter((line) => initialItemNotes[line.component_key]);
    if (!initialNotes && written.length === 0) {
      return (
        <p className="text-sm text-brand-muted">
          לא נוספו הערות להסכם הזה.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        {written.map((line) => (
          <div key={line.component_key}>
            <p className="text-xs font-semibold text-brand-muted">{line.label}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-brand-dark">
              {initialItemNotes[line.component_key]}
            </p>
          </div>
        ))}
        {initialNotes ? (
          <div>
            <p className="text-xs font-semibold text-brand-muted">הערות כלליות</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-brand-dark">{initialNotes}</p>
          </div>
        ) : null}
        <p className="text-xs text-brand-muted">
          {status === "signed"
            ? "ההסכם נחתם, וההערות הן חלק ממה שנחתם — לכן הן נעולות."
            : "ההסכם בוטל, ולכן ההערות נעולות."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {quoteNotes?.trim() ? (
        <div className="rounded-xl border border-slate-200 bg-brand-grey p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-brand-muted">מה שנכתב בהצעת המחיר</p>
            <button
              type="button"
              onClick={appendQuoteNotes}
              className="rounded-pill border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-white/60"
            >
              העתקה להערות ההסכם
            </button>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-dark">
            {quoteNotes.trim()}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-brand-muted">
            הטקסט הזה אינו חלק מההסכם. מה שצריך להופיע במסמך שהלקוח חותם עליו — העתיקו לשדה
            שלמטה, וערכו לפני שמירה.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {lines.map((line) => (
          <div key={line.component_key}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor={`note-${line.component_key}`}
                className="text-sm font-semibold text-brand-dark"
              >
                {line.label}
                {line.quantity > 1 ? (
                  <span className="me-1 text-xs font-normal text-brand-muted">× {line.quantity}</span>
                ) : null}
              </label>
              <span className="text-xs text-brand-muted">
                {Number(line.setup_total) > 0 ? `הקמה ${fmt(Number(line.setup_total))}` : ""}
                {Number(line.setup_total) > 0 && Number(line.monthly_total) > 0 ? " · " : ""}
                {Number(line.monthly_total) > 0 ? `${fmt(Number(line.monthly_total))} לחודש` : ""}
              </span>
            </div>
            <textarea
              id={`note-${line.component_key}`}
              rows={2}
              maxLength={400}
              value={itemNotes[line.component_key] ?? ""}
              onChange={(event) =>
                setItemNotes({ ...itemNotes, [line.component_key]: event.target.value })
              }
              placeholder="הערה שתופיע בהסכם מתחת לשורה הזו"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-brand-dark outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="contract-notes" className="mb-1 block text-sm font-semibold text-brand-dark">
          הערות כלליות להסכם
        </label>
        <p className="mb-2 text-xs leading-relaxed text-brand-muted">
          מה שסוכם עם הלקוח ואינו כתוב בנוסח: מועדי התקנה, ציוד של הלקוח, שלבים, חריגים.
          מה שנכתב כאן מופיע בהסכם לפני החתימה, וגובר על ההוראות הכלליות במקרה של סתירה.
        </p>
        <textarea
          id="contract-notes"
          rows={5}
          maxLength={4000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="לדוגמה: העמדה השנייה תותקן בסניף רמת גן לאחר סיום השיפוץ, ללא חיוב נוסף על ההובלה."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-brand-dark outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
        />
        <p className="mt-1 text-left text-xs text-brand-muted">{notes.length} / 4000</p>
      </div>

      {live ? (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
          ההסכם כבר אצל הלקוח. שמירה משנה את מה שהוא רואה בקישור — אם הוא כבר קרא אותו, עדכנו אותו.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-pill bg-brand-indigo px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {busy ? "שומר…" : "שמירת הערות"}
        </button>
        {dirty ? (
          <span className="text-sm font-medium text-amber-700">
            יש הערות שלא נשמרו — הן לא בתוך המסמך עד שתשמרו.
          </span>
        ) : null}
        {saved && !dirty ? <span className="text-sm text-emerald-700">נשמר</span> : null}
      </div>
    </div>
  );
}
