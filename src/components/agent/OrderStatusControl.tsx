"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ORDER_STATUS } from "@/lib/agent/status";
import type { OrderStatus } from "@/lib/agent/orders";

/**
 * Moving an order along, and the two things that need saying while it moves:
 * when we promised the customer they would be live, and why it was cancelled.
 *
 * The forward step is one button rather than a status dropdown. The track has
 * one direction, and a control that offers "ממתינה להקמה" to an order that is
 * already live invites the mis-click it should be preventing. Going backwards
 * is possible but deliberately out of the way.
 */
export function OrderStatusControl({
  orderId,
  status,
  targetLiveOn,
  cancelReason,
}: {
  orderId: string;
  status: OrderStatus;
  targetLiveOn: string | null;
  cancelReason: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState(targetLiveOn ?? "");

  const current = ORDER_STATUS[status];

  const patch = async (body: Record<string, unknown>, note: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/agent/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "העדכון נכשל");
        return false;
      }
      setMessage(note);
      router.refresh();
      return true;
    } catch {
      setError("העדכון נכשל — בדקו את החיבור לרשת");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-brand-dark">סטטוס הקמה</h2>
        <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${current.className}`}>
          {current.label}
        </span>
      </div>

      {current.next ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ status: current.next }, `הסטטוס עודכן ל״${ORDER_STATUS[current.next!].label}״`)}
          className="w-full rounded-pill bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:opacity-40"
        >
          {busy ? "מעדכן…" : current.nextLabel}
        </button>
      ) : status === "live" ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          הלקוח חי ועובד. אין מה לעשות כאן.
        </p>
      ) : null}

      {status !== "cancelled" ? (
        <>
          <label className="block text-xs font-semibold text-brand-muted" htmlFor="target-live">
            תאריך יעד לעלייה לאוויר
          </label>
          <div className="flex gap-2">
            <input
              id="target-live"
              type="date"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
            />
            <button
              type="button"
              disabled={busy || target === (targetLiveOn ?? "")}
              onClick={() => patch({ targetLiveOn: target || null }, "תאריך היעד נשמר")}
              className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-40"
            >
              שמירה
            </button>
          </div>
        </>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {status === "cancelled" ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-brand-muted">
            בוטלה{cancelReason ? `: ${cancelReason}` : ""}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ status: "pending_setup" }, "ההזמנה הוחזרה לפעילות")}
            className="w-full rounded-pill border border-slate-200 px-4 py-2 text-xs font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-40"
          >
            החזרה לפעילות
          </button>
        </div>
      ) : cancelling ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-brand-muted" htmlFor="cancel-reason">
            סיבת הביטול
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
            placeholder="הלקוח חזר בו, סגר את העסק, לא ניתן ליצור קשר…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length === 0}
              onClick={async () => {
                const ok = await patch({ status: "cancelled", reason }, "ההזמנה בוטלה");
                if (ok) setCancelling(false);
              }}
              className="flex-1 rounded-pill bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              ביטול ההזמנה
            </button>
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="rounded-pill border border-slate-200 px-4 py-2 text-xs font-semibold text-brand-muted"
            >
              חזרה
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="w-full border-t border-slate-100 pt-3 text-xs font-semibold text-brand-muted transition-colors hover:text-red-700"
        >
          ביטול ההזמנה
        </button>
      )}
    </div>
  );
}
