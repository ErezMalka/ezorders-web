"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContractStatus } from "@/lib/agent/contracts";

/**
 * Send it, copy the customer's link, or cancel it.
 *
 * The link is shown as text and not only as a button, because half the time it
 * is going into a WhatsApp message an agent types themselves, and a copy button
 * with nothing to read beside it gives them no way to check what they pasted.
 */
export function ContractActions({
  id,
  status,
  token,
  siteUrl,
}: {
  id: string;
  status: ContractStatus;
  token: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = `${siteUrl.replace(/\/+$/, "")}/c/${token}`;
  const live = status === "sent" || status === "viewed" || status === "signed";

  const act = async (action: "send" | "cancel") => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "הפעולה נכשלה");
        return;
      }
      router.refresh();
    } catch {
      setError("הפעולה נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("הדפדפן לא איפשר העתקה. סמנו את הקישור והעתיקו ידנית.");
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {status === "draft" ? (
        <>
          <p className="text-sm leading-relaxed text-brand-muted">
            ההסכם עדיין טיוטה. הלקוח לא יכול לפתוח אותו עד שתשלחו — הקישור לא קיים בשבילו.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act("send")}
              className="rounded-pill bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:opacity-40"
            >
              {busy ? "שולח…" : "שליחה ללקוח"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act("cancel")}
              className="rounded-pill border border-slate-200 px-6 py-2.5 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey disabled:opacity-40"
            >
              ביטול ההסכם
            </button>
          </div>
        </>
      ) : null}

      {live ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-brand-muted">הקישור של הלקוח</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-brand-grey px-3 py-2 font-mono text-xs text-brand-dark"
            >
              {link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-pill bg-brand-dark px-5 py-2 text-xs font-semibold text-white"
            >
              {copied ? "הועתק" : "העתקה"}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="rounded-pill border border-slate-200 px-5 py-2 text-xs font-semibold text-brand-muted"
            >
              פתיחה
            </a>
          </div>
        </div>
      ) : null}

      {status === "sent" || status === "viewed" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => act("cancel")}
          className="text-xs font-semibold text-brand-muted underline underline-offset-2 disabled:opacity-40"
        >
          ביטול ההסכם
        </button>
      ) : null}
    </div>
  );
}
