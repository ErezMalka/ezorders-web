"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContractPaymentRow, PayablePart, PaymentStatus, PaymentTotals } from "@/lib/agent/payments";

/**
 * Paying for a signed contract, as the agent sees it.
 *
 * Usually one link, which a new one replaces — because the amount changed, or
 * the customer let the page lapse. The history stays underneath so "why does
 * the customer have two links" has an answer.
 *
 * But a bill can be split, and then there are several live at once: the
 * customer puts הקמה on a card and sends the עמדה by transfer. GROW has no
 * partial payment, so each part is a link of its own with its own address, and
 * the headline moves from the newest row to the sum — one part can read "שולם"
 * while half the contract is still owed.
 *
 * The amount is editable before a link is made and not after: a link is a
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
  payableParts,
  totals,
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
  /** The one-time total broken into pieces the customer recognises. */
  payableParts: PayablePart[];
  /** Null only when the contract has no quote, which the section already handles. */
  totals: PaymentTotals | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"issue" | "check" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [installments, setInstallments] = useState("1");

  const current = payments.find((p) => p.status !== "cancelled") ?? null;
  const base = siteUrl.replace(/\/+$/, "");
  const payLink = `${base}/c/${token}/pay`;
  const signed = contractStatus === "signed";

  // ── splitting ──────────────────────────────────────────────────────────────
  // The customer chooses what to pay for, not how much: "הקמה on the card, the
  // עמדה by transfer" is something they can check at a glance, where "₪1,000 of
  // ₪2,879" needs a calculator and trust. GROW has no partial payment — the
  // documentation has no open amount and a product price is fixed — so each
  // part is its own link, and each link carries the name of what it covers
  // through to the page and the invoice.
  const [splitting, setSplitting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const live = payments.filter((p) => p.status === "pending" || p.status === "paid");
  const pickedParts = payableParts.filter((p) => picked.includes(p.key));
  const pickedTotal = Math.round(pickedParts.reduce((t, p) => t + p.amount, 0) * 100) / 100;

  const outstanding = totals?.outstanding ?? 0;
  const pendingLinks = payments.filter((p) => p.status === "pending");

  /**
   * A contract is issued a link for the whole bill the moment it is signed, so
   * by the time anyone wants to split it there is nothing left "unclaimed" and
   * the picker had no reason to appear. It never appeared. That is the bug.
   *
   * Splitting therefore REPLACES that one whole-bill link rather than squeezing
   * in beside it — the agent has just said they want parts instead of the
   * whole — and only once parts exist does a further part get added to them.
   */
  const wholeBillLink =
    pendingLinks.length === 1 && Math.abs(Number(pendingLinks[0]!.amount) - outstanding) < 0.01
      ? pendingLinks[0]!
      : null;

  // Picking everything still open supersedes every live link, whatever they
  // were for — the same rule the customer's own page uses, so the two screens
  // cannot disagree about what a selection means.
  const openParts = payableParts.filter((p) => p.claimedBy?.status !== "paid");
  const coversEverythingOpen =
    openParts.length > 0 && openParts.every((p) => picked.includes(p.key));

  const splitMode: "replace" | "add" = wholeBillLink || coversEverythingOpen ? "replace" : "add";

  // What this link may be worth: everything still owed when the whole-bill link
  // is about to be retired, otherwise only what no link covers yet.
  const budget = splitMode === "replace" ? outstanding : (totals?.unclaimed ?? 0);
  const overBudget = pickedTotal > budget + 0.001;

  const toggle = (key: string) =>
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const issueSplit = () => {
    if (!(pickedTotal > 0)) {
      setError("בחרו לפחות פריט אחד");
      return;
    }
    if (overBudget) {
      setError("הפריטים שנבחרו עולים על היתרה שנותרה");
      return;
    }
    void call(
      {
        action: "payment_link",
        amount: pickedTotal,
        maxInstallments: 1,
        mode: splitMode,
        forLabel: pickedParts.map((p) => p.label).join(", "),
        partKeys: pickedParts.map((p) => p.key),
      },
      "issue"
    ).then(() => setPicked([]));
  };

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
          {/* Where the contract stands, before any one link. With a split this
              is the only honest headline: one row can say "שולם" while the
              contract is half owed. */}
          {totals && totals.due > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-brand-grey px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-brand-dark">
                  {totals.standing === "paid"
                    ? "שולם במלואו"
                    : totals.standing === "partial"
                      ? "שולם חלקית"
                      : "טרם שולם"}
                </span>
                <span className="text-xs text-brand-muted">
                  {ILS.format(totals.paid)} מתוך {ILS.format(totals.due)}
                  {totals.outstanding > 0 ? ` · נותרו ${ILS.format(totals.outstanding)}` : ""}
                </span>
              </div>
              {totals.standing === "partial" ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (totals.paid / totals.due) * 100)}%` }}
                  />
                </div>
              ) : null}
              {totals.unclaimed > 0 && totals.awaiting > 0 ? (
                <p className="mt-2 text-xs text-brand-muted">
                  {ILS.format(totals.awaiting)} ממתינים בקישורים קיימים · {ILS.format(totals.unclaimed)} עדיין בלי קישור
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Splitting by item. Offered whenever anything is still owed —
              because a picker that can only refuse is worse than no picker. */}
          {payableParts.length > 1 && outstanding > 0 ? (
            <div className="rounded-xl border border-slate-200 p-4">
              {!splitting ? (
                <button
                  type="button"
                  onClick={() => setSplitting(true)}
                  className="text-sm font-semibold text-brand-pinkStrong"
                >
                  פיצול תשלום — קישור נפרד לפריט מסוים
                </button>
              ) : (
                <>
                  <p className="mb-1 text-sm font-bold text-brand-dark">מה הלקוח משלם בקישור הזה?</p>
                  <p className="mb-3 text-xs leading-relaxed text-brand-muted">
                    בחרו פריטים ותקבלו קישור נפרד עבורם — למשל הקמה באשראי, ועמדה בהעברה בנקאית.
                    כל קישור מציע אשראי, ביט והעברה בנקאית, והלקוח בוחר בעצמו.
                  </p>

                  {/* Said before the click. The link that already exists covers
                      the whole bill, and asking for parts is asking to stop
                      offering the whole — so it goes. An agent who has already
                      sent it to the customer needs to know that. */}
                  {wholeBillLink ? (
                    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      קיים קישור פתוח על מלוא הסכום ({ILS.format(Number(wholeBillLink.amount))}).
                      הנפקת פיצול תבטל אותו — אם כבר שלחתם אותו ללקוח, שלחו במקומו את הקישורים החדשים.
                    </p>
                  ) : null}

                  <ul className="mb-3 space-y-1.5">
                    {payableParts.map((part) => {
                      // A part the whole-bill link "covers" is not really taken:
                      // that link is about to be replaced by this very split.
                      const taken = splitMode === "add" ? part.claimedBy : null;
                      return (
                        <li key={part.key}>
                          <label
                            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                              taken ? "opacity-60" : "cursor-pointer hover:bg-brand-grey"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={picked.includes(part.key)}
                              onChange={() => toggle(part.key)}
                              disabled={!!taken}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="flex-1 text-sm text-brand-dark">
                              {part.label}
                              {taken ? (
                                <span className="ms-2 text-xs font-semibold text-brand-muted">
                                  {taken.status === "paid" ? "· שולם" : "· כבר בקישור קיים"}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-sm font-semibold text-brand-dark">{ILS.format(part.amount)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className={`text-sm font-bold ${overBudget ? "text-red-700" : "text-brand-dark"}`}>
                      נבחרו {ILS.format(pickedTotal)}
                      {overBudget ? ` — מעל היתרה (${ILS.format(budget)})` : ""}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSplitting(false); setPicked([]); }}
                        className="rounded-pill border border-slate-200 px-4 py-2 text-xs font-semibold text-brand-muted"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={issueSplit}
                        disabled={busy !== null || !(pickedTotal > 0) || overBudget}
                        className="rounded-pill bg-brand-pinkStrong px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busy === "issue" ? "מנפיק…" : "הנפקת קישור לפריטים שנבחרו"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Every live link, because a split has more than one and each needs
              its own address to send. */}
          {live.length > 1 ? (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-xs font-semibold text-brand-muted">קישורי התשלום ({live.length})</p>
              <ul className="space-y-2">
                {live.map((p) => {
                  const url = `${base}/c/${token}/pay/${p.id}`;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                      <span className={`rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS[p.status].tone}`}>
                        {STATUS[p.status].label}
                      </span>
                      <span className="text-sm font-semibold text-brand-dark">{ILS.format(Number(p.amount))}</span>
                      {p.status === "pending" ? (
                        <>
                          <code dir="ltr" className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-brand-grey px-2 py-1 font-mono text-[11px] text-brand-dark">
                            {url}
                          </code>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(url).catch(() => setError("ההעתקה נכשלה — סמנו את הקישור והעתיקו ידנית"))}
                            className="rounded-pill bg-brand-dark px-4 py-1.5 text-[11px] font-semibold text-white"
                          >
                            העתקה
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

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
