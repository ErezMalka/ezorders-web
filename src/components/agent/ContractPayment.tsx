"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContractPaymentRow, PaymentStatus } from "@/lib/agent/payments";

/**
 * The card payment for a signed contract, as the agent sees it.
 *
 * One link at a time. Issuing a new one — because the amount changed, or the
 * customer let the page lapse — retires the old one on the server; the history
 * stays underneath so a "why does the customer have two links" has an answer.
 *
 * The amount is editable before the link is made and not after: a link is a
 * promise of a price, and changing the price means a new promise. Instalments
 * are a cap the GROW page offers, never a schedule we keep.
 */

const ILS = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });
const STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

const STATUS: Record<PaymentStatus, { label: string; tone: string }> = {
  pending: { label: "ממתין לתשלום", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  paid: { label: "שולם", tone: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  failed: { label: "נכשל", tone: "bg-red-50 text-red-800 border-red-200" },
  cancelled: { label: "בוטל", tone: "bg-slate-50 text-slate-600 border-slate-200" },
};

export function ContractPayment({
  contractId,
  contractStatus,
  token,
  siteUrl,
  enabled,
  defaultAmount,
  payments,
}: {
  contractId: string;
  contractStatus: string;
  token: string;
  siteUrl: string;
  /** False when GROW is not configured on the server; the section explains instead of failing. */
  enabled: boolean;
  /** One-time total with VAT, as the contract was priced. */
  defaultAmount: number;
  /** Newest first. */
  payments: ContractPaymentRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"issue" | "check" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [installments, setInstallments] = useState("1");

  const current = payments.find((p) => p.status !== "cancelled") ?? null;
  const payLink = `${siteUrl.replace(/\/+$/, "")}/c/${token}/pay`;
  const signed = contractStatus === "signed";

  const call = async (body: Record<string, unknown>, kind: "issue" | "check") => {
    setBusy(kind);
    setError(null);
    try {
      const response = await fetch(`/api/agent/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "הפעולה נכשלה");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("הפעולה נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(null);
    }
  };

  const issue = () => {
    const value = Number(String(amount).replace(/[^\d.]/g, ""));
    if (!(value > 0)) {
      setError("הסכום חייב להיות מספר גדול מאפס");
      return;
    }
    void call({ action: "payment_link", amount: value, maxInstallments: Number(installments) || 1 }, "issue");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("הדפדפן לא איפשר העתקה. סמנו את הקישור והעתיקו ידנית.");
    }
  };

  return (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-brand-dark">תשלום בכרטיס (GROW)</h2>
          <p className="text-xs leading-relaxed text-brand-muted">
            התשלום החד־פעמי — ציוד והקמה, כולל מע״מ. הלקוח משלם בדף מאובטח של GROW; התשלום החודשי נגבה בנפרד.
          </p>
        </div>
        {current ? (
          <span className={`rounded-pill border px-3 py-1 text-xs font-semibold ${STATUS[current.status].tone}`}>
            {STATUS[current.status].label}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {!enabled ? (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900">
          תשלום בכרטיס אינו מוגדר באתר. צריך להגדיר ב-Vercel את GROW_USER_ID ו-GROW_PAGE_CODE (ראו .env.example).
        </p>
      ) : !signed ? (
        <p className="text-sm leading-relaxed text-brand-muted">
          קישור תשלום נפתח אחרי שהלקוח חותם. ברגע החתימה האתר מנפיק אותו לבד ומצרף אותו למייל העותק החתום;
          כאן תוכלו לראות אותו, להעתיק אותו או להנפיק אחר בסכום שונה.
        </p>
      ) : (
        <div className="space-y-4">
          {current ? (
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold text-brand-muted">סכום</dt>
                <dd className="text-sm font-bold text-brand-dark">{ILS.format(Number(current.amount))}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-brand-muted">תשלומים</dt>
                <dd className="text-sm text-brand-dark">{current.max_installments === 1 ? "תשלום אחד" : `עד ${current.max_installments}`}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-brand-muted">{current.status === "paid" ? "שולם ב־" : "הונפק ב־"}</dt>
                <dd className="text-sm text-brand-dark" dir="ltr">
                  {STAMP.format(new Date(current.status === "paid" && current.paid_at ? current.paid_at : current.created_at))}
                </dd>
              </div>
              {current.grow_transaction_id ? (
                <div className="sm:col-span-3">
                  <dt className="text-xs font-semibold text-brand-muted">מזהה עסקה ב-GROW</dt>
                  <dd className="font-mono text-xs text-brand-dark" dir="ltr">{current.grow_transaction_id}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {current?.status === "pending" ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-brand-muted">קישור התשלום של הלקוח</p>
              <div className="flex flex-wrap items-center gap-2">
                <code dir="ltr" className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-brand-grey px-3 py-2 font-mono text-xs text-brand-dark">
                  {payLink}
                </code>
                <button type="button" onClick={copy} className="rounded-pill bg-brand-dark px-5 py-2 text-xs font-semibold text-white">
                  {copied ? "הועתק" : "העתקה"}
                </button>
                <a href={payLink} target="_blank" rel="noreferrer" className="rounded-pill border border-slate-200 px-5 py-2 text-xs font-semibold text-brand-muted">
                  פתיחה
                </a>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-brand-muted">
                הקישור קבוע — גם אם דף התשלום של GROW פג, הוא יפתח דף חדש. שולחים אותו ללקוח בוואטסאפ או במייל.
              </p>
            </div>
          ) : null}

          {current?.status !== "paid" ? (
            editing || !current ? (
              <div className="rounded-xl border border-slate-200 bg-brand-grey/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-brand-muted">סכום לתשלום (₪, כולל מע״מ)</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-brand-dark"
                      dir="ltr"
                    />
                    <span className="mt-1 block text-[11px] text-brand-muted">לפי ההסכם: {ILS.format(defaultAmount)}</span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-brand-muted">מספר תשלומים מרבי</span>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-brand-dark"
                    >
                      {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                        <option key={n} value={n}>{n === 1 ? "תשלום אחד" : `עד ${n} תשלומים`}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={issue}
                    className="rounded-pill bg-brand-pinkStrong px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkInk disabled:opacity-40"
                  >
                    {busy === "issue" ? "מנפיק…" : current ? "הנפקת קישור חדש" : "הנפקת קישור תשלום"}
                  </button>
                  {current ? (
                    <button type="button" onClick={() => setEditing(false)} className="rounded-pill border border-slate-200 px-6 py-2.5 text-sm font-semibold text-brand-muted">
                      ביטול
                    </button>
                  ) : null}
                </div>
                {current ? (
                  <p className="mt-2 text-xs text-brand-muted">קישור חדש מבטל את הקודם — ללקוח יהיה דף תשלום אחד בלבד.</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void call({ action: "payment_check" }, "check")}
                  className="rounded-pill bg-brand-dark px-5 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {busy === "check" ? "בודק…" : "בדיקת סטטוס מול GROW"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => { setAmount(String(current ? Number(current.amount) : defaultAmount)); setEditing(true); }}
                  className="rounded-pill border border-slate-200 px-5 py-2 text-xs font-semibold text-brand-muted disabled:opacity-40"
                >
                  קישור חדש / שינוי סכום
                </button>
              </div>
            )
          ) : null}

          {payments.length > 1 ? (
            <details className="text-xs text-brand-muted">
              <summary className="cursor-pointer font-semibold">היסטוריית קישורים ({payments.length})</summary>
              <ul className="mt-2 space-y-1">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap gap-x-3" dir="rtl">
                    <span dir="ltr">{STAMP.format(new Date(p.created_at))}</span>
                    <span>{ILS.format(Number(p.amount))}</span>
                    <span>{STATUS[p.status].label}</span>
                    {p.grow_transaction_id ? <span className="font-mono" dir="ltr">{p.grow_transaction_id}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
