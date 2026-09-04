import Link from "next/link";

import { fmt } from "@/lib/pricing";
import type { QuoteListRow } from "@/lib/agent/quotes";
import { QUOTE_STATUS, heDate } from "@/lib/agent/status";

/**
 * The quote list. `showAgent` is driven by the viewer's role — a manager needs
 * to see whose quote it is, an agent is only ever looking at their own.
 */
export function QuotesTable({
  quotes,
  showAgent,
  emptyMessage = "עדיין אין הצעות",
}: {
  quotes: QuoteListRow[];
  showAgent: boolean;
  emptyMessage?: string;
}) {
  if (quotes.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-brand-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-brand-grey text-xs text-brand-muted">
            <th className="px-4 py-3 text-right font-semibold">מס׳ הצעה</th>
            <th className="px-4 py-3 text-right font-semibold">לקוח</th>
            {showAgent ? <th className="px-4 py-3 text-right font-semibold">סוכן</th> : null}
            <th className="px-4 py-3 text-right font-semibold">תאריך</th>
            <th className="px-4 py-3 text-right font-semibold">הקמה</th>
            <th className="px-4 py-3 text-right font-semibold">חודשי</th>
            <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => {
            const status = QUOTE_STATUS[quote.status];
            return (
              <tr key={quote.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-grey">
                <td className="px-4 py-3 font-semibold text-brand-dark">
                  {quote.quote_number}
                  {quote.price_overridden ? (
                    <span
                      title="הצעה עם מחיר ידני"
                      className="ms-2 inline-block rounded-pill bg-brand-pinkStrong px-1.5 py-0.5 align-middle text-[10px] font-bold text-white"
                    >
                      ידני
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className="text-brand-dark">{quote.customer_name}</span>
                  {quote.customer_contact ? (
                    <span className="block text-xs text-brand-muted">{quote.customer_contact}</span>
                  ) : null}
                </td>
                {showAgent ? <td className="px-4 py-3 text-brand-muted">{quote.agent_name}</td> : null}
                <td className="px-4 py-3 tabular-nums text-brand-muted">
                  {heDate.format(new Date(quote.created_at))}
                </td>
                <td className="px-4 py-3 tabular-nums text-brand-dark">{fmt(quote.setup_total)}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-brand-pink">
                  {fmt(quote.monthly_total)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  {quote.view_count > 0 ? (
                    <span className="mt-1 block text-[11px] text-brand-muted">
                      נצפתה {quote.view_count}×
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-left">
                  <Link
                    href={`/he/agent/quotes/${quote.id}`}
                    className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-muted transition-colors hover:bg-brand-tint hover:text-brand-pinkInk"
                  >
                    צפייה
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
