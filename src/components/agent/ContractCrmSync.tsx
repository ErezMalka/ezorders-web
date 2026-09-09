"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The manager's approval: send this contract into the CRM as an order.
 *
 * One button, one order. Once pushed, the section shows the CRM order number
 * and the button is gone — the server refuses a second push anyway, but a
 * button that would only ever say "already done" is clutter.
 *
 * Agents see the state and not the button: an order in the CRM starts
 * installation and billing, and that is a manager's call.
 */

const STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function ContractCrmSync({
  contractId,
  contractStatus,
  isManager,
  enabled,
  paid,
  crmOrderNumber,
  crmSyncedAt,
}: {
  contractId: string;
  contractStatus: string;
  isManager: boolean;
  /** False when the CRM keys are not set on the server. */
  enabled: boolean;
  /** True when GROW has confirmed the one-time payment. */
  paid: boolean;
  crmOrderNumber: string | null;
  crmSyncedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const signed = contractStatus === "signed";
  const synced = Boolean(crmOrderNumber) || Boolean(done);

  const push = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crm_push" }),
      });
      const payload = (await response.json()) as { error?: string; orderNumber?: string };
      if (!response.ok) {
        setError(payload.error ?? "ההעברה נכשלה");
        return;
      }
      setDone(payload.orderNumber ?? "");
      setConfirming(false);
      router.refresh();
    } catch {
      setError("ההעברה נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-brand-dark">העברה ל-CRM</h2>
          <p className="text-xs leading-relaxed text-brand-muted">
            אישור מנהל הופך את ההסכם להזמנה ב-CRM: לקוח, הזמנה עם כל השורות, והתשלום אם התקבל. משם מתחילים ההתקנה וההקמה.
          </p>
        </div>
        {synced ? (
          <span className="rounded-pill border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            הועבר · הזמנה {crmOrderNumber ?? done}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      {synced ? (
        <p className="text-sm text-brand-muted">
          ההסכם הועבר ל-CRM{crmSyncedAt ? ` ב-${STAMP.format(new Date(crmSyncedAt))}` : ""}. ההזמנה מנוהלת משם.
        </p>
      ) : !enabled ? (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900">
          החיבור ל-CRM אינו מוגדר באתר. צריך להגדיר ב-Vercel את CRM_SUPABASE_URL ו-CRM_SUPABASE_SERVICE_ROLE_KEY.
        </p>
      ) : !signed ? (
        <p className="text-sm text-brand-muted">אפשר להעביר ל-CRM אחרי שהלקוח חותם.</p>
      ) : !isManager ? (
        <p className="text-sm text-brand-muted">ממתין לאישור מנהל. המנהל יראה כאן כפתור העברה.</p>
      ) : (
        <div className="space-y-3">
          {!paid ? (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900">
              התשלום החד־פעמי עדיין לא התקבל ב-GROW. אפשר להעביר בכל זאת — ההזמנה תיפתח ב-CRM במצב ״ממתינה לאישור תשלום״.
            </p>
          ) : null}
          {confirming ? (
            <div className="rounded-xl border border-slate-200 bg-brand-grey/60 p-4">
              <p className="mb-3 text-sm text-brand-dark">
                להעביר את ההסכם ל-CRM עכשיו? תיווצר הזמנה חדשה{paid ? " במצב ״אושרה״ עם רישום התשלום" : " במצב ״ממתינה לאישור תשלום״"}. אי אפשר לבטל מכאן — רק מתוך ה-CRM.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void push()} className="rounded-pill bg-brand-pinkStrong px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-pinkInk disabled:opacity-40">
                  {busy ? "מעביר…" : "כן, העבר ל-CRM"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-pill border border-slate-200 px-6 py-2.5 text-sm font-semibold text-brand-muted">
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-pill bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white">
              אישור והעברה ל-CRM
            </button>
          )}
        </div>
      )}
    </section>
  );
}
