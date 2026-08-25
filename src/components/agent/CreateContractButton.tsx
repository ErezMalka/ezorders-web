"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Draft a contract from this quote.
 *
 * Asking twice is safe — the database hands back the first one rather than
 * making a second — so this needs no confirmation dialogue and no disabled
 * state after the first press.
 */
export function CreateContractButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const payload = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "הפקת ההסכם נכשלה");
        return;
      }
      router.push(`/he/agent/contracts/${payload.id}`);
    } catch {
      setError("הפקת ההסכם נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={create}
        className="rounded-pill border border-brand-pink px-5 py-2.5 text-sm font-semibold text-brand-pink transition-colors hover:bg-brand-tint disabled:opacity-40"
      >
        {busy ? "מפיק…" : "הפקת הסכם"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
