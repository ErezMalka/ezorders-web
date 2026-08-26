"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { heDate } from "@/lib/agent/status";
import type { QuoteStatus } from "@/lib/agent/quotes";

/**
 * What an agent does with a finished quote: look at it, send it, share the link.
 *
 * The print view opens in a new tab and is the same HTML the PDF is rendered
 * from, so "what I checked" and "what the customer got" cannot drift.
 */
export function QuoteActions({
  quoteId,
  status,
  customerEmail,
  publicToken,
  viewCount,
  firstViewedAt,
}: {
  quoteId: string;
  status: QuoteStatus;
  customerEmail: string | null;
  publicToken: string;
  viewCount: number;
  firstViewedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const printUrl = `/he/agent/quotes/${quoteId}/print`;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${publicToken}` : "";

  const send = async (channel: "email" | "whatsapp") => {
    setBusy(channel);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/agent/quotes/${quoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; whatsappUrl?: string };

      if (!response.ok) {
        setError(payload.error ?? "השליחה נכשלה");
        return;
      }

      if (channel === "whatsapp" && payload.whatsappUrl) {
        window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
        setMessage("וואטסאפ נפתח עם ההודעה מוכנה");
      } else {
        setMessage(`ההצעה נשלחה ל-${customerEmail}`);
      }
      router.refresh();
    } catch {
      setError("השליחה נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Copy this quote into a new draft and go there.
   *
   * Offered on every quote, not only on the ones that cannot be edited: the
   * common case is a second branch of the same customer, or a variation the
   * agent wants to send alongside the first rather than instead of it.
   */
  const duplicate = async () => {
    setBusy("duplicate");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/agent/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateOf: quoteId }),
      });
      const payload = (await response.json()) as { id?: string; error?: string; dropped?: string[] };

      if (!response.ok || !payload.id) {
        setError(payload.error ?? "השכפול נכשל");
        setBusy(null);
        return;
      }

      // A retired product cannot be sold, so it does not survive the copy. When
      // something was left behind we stay put and say what: an agent who lands
      // on the new draft with a shorter total would have to work out why.
      if (payload.dropped?.length) {
        setDuplicateId(payload.id);
        setMessage(`שוכפל — אבל ${payload.dropped.join(", ")} כבר לא במחירון ולא הועתקו.`);
        setBusy(null);
        return;
      }

      router.push(`/he/agent/quotes/${payload.id}`);
      router.refresh();
    } catch {
      setError("השכפול נכשל — בדקו את החיבור לרשת");
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage("הקישור הועתק");
    } catch {
      setError("ההעתקה נכשלה — העתיקו את הקישור ידנית");
    }
  };

  const canSendEmail = Boolean(customerEmail);

  return (
    <div className="space-y-2 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-brand-dark">שליחה</h2>

      <a
        href={printUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-pill bg-brand-pink px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark"
      >
        תצוגה מקדימה והורדה כ-PDF
      </a>

      <button
        type="button"
        onClick={() => send("email")}
        disabled={busy !== null || !canSendEmail}
        title={canSendEmail ? undefined : "לא הוזן אימייל ללקוח"}
        className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === "email" ? "שולח…" : "שליחה במייל"}
      </button>

      <button
        type="button"
        onClick={() => send("whatsapp")}
        disabled={busy !== null}
        className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-40"
      >
        {busy === "whatsapp" ? "פותח…" : "שליחה בוואטסאפ"}
      </button>

      <button
        type="button"
        onClick={copyLink}
        className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark"
      >
        העתקת קישור ללקוח
      </button>

      <div className="mt-1 space-y-2 border-t border-slate-100 pt-3">
        {status === "draft" ? (
          <a
            href={`/he/agent/quotes/${quoteId}/edit`}
            className="block w-full rounded-pill border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark"
          >
            עריכת ההצעה
          </a>
        ) : null}

        <button
          type="button"
          onClick={duplicate}
          disabled={busy !== null}
          className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-40"
        >
          {busy === "duplicate" ? "משכפל…" : "שכפול לטיוטה חדשה"}
        </button>

        {status === "draft" ? null : (
          <p className="text-xs text-brand-muted">
            ההצעה כבר נשלחה ולכן נעולה לעריכה — מה שהלקוח קרא נשאר כפי שהוא. שכפול פותח טיוטה חדשה,
            עם מספר וקישור משלה, במחירי המחירון של היום.
          </p>
        )}
      </div>

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {message}
          {duplicateId ? (
            <>
              {" "}
              <a href={`/he/agent/quotes/${duplicateId}`} className="font-bold underline">
                פתיחת הטיוטה החדשה
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {status === "draft" ? (
        <p className="pt-1 text-xs text-brand-muted">
          ההצעה עדיין טיוטה — הקישור ללקוח ייפתח רק אחרי שליחה.
        </p>
      ) : null}

      {viewCount > 0 ? (
        <p className="border-t border-slate-100 pt-3 text-xs text-brand-muted">
          הלקוח פתח את ההצעה {viewCount} פעמים
          {firstViewedAt ? `, לראשונה ב-${heDate.format(new Date(firstViewedAt))}` : ""}.
        </p>
      ) : null}
    </div>
  );
}
