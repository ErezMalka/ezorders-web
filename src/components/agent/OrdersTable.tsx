import Link from "next/link";

import { fmt } from "@/lib/pricing";
import type { OrderListRow } from "@/lib/agent/orders";
import { ORDER_STATUS, heDate } from "@/lib/agent/status";

/**
 * The order list. Shaped around the question an agent opens this page to ask —
 * "what have I sold that is not live yet, and how long has it been sitting?" —
 * so the age of an unfinished order is a column rather than something to work
 * out from a date.
 */
export function OrdersTable({
  orders,
  showAgent,
  emptyMessage = "עדיין אין הזמנות",
}: {
  orders: OrderListRow[];
  showAgent: boolean;
  emptyMessage?: string;
}) {
  if (orders.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-brand-muted">{emptyMessage}</p>;
  }

  const today = Date.now();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-brand-grey text-xs text-brand-muted">
            <th className="px-4 py-3 text-right font-semibold">מס׳ הזמנה</th>
            <th className="px-4 py-3 text-right font-semibold">לקוח</th>
            {showAgent ? <th className="px-4 py-3 text-right font-semibold">סוכן</th> : null}
            <th className="px-4 py-3 text-right font-semibold">אושרה</th>
            <th className="px-4 py-3 text-right font-semibold">הקמה</th>
            <th className="px-4 py-3 text-right font-semibold">חודשי</th>
            <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const status = ORDER_STATUS[order.status];
            const openDays = Math.floor(
              (today - new Date(order.accepted_at).getTime()) / 86_400_000
            );
            const stalling = order.status !== "live" && order.status !== "cancelled" && openDays >= 14;

            return (
              <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-grey">
                <td className="px-4 py-3 font-semibold text-brand-dark">
                  {order.order_number}
                  <span className="block text-[11px] font-normal text-brand-muted">
                    {order.quote_number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-brand-dark">{order.customer_name}</span>
                  {order.customer_contact ? (
                    <span className="block text-xs text-brand-muted">{order.customer_contact}</span>
                  ) : null}
                </td>
                {showAgent ? <td className="px-4 py-3 text-brand-muted">{order.agent_name}</td> : null}
                <td className="px-4 py-3 tabular-nums text-brand-muted">
                  {heDate.format(new Date(order.accepted_at))}
                  {order.accept_channel === "agent" ? (
                    <span className="block text-[11px] text-brand-muted">נרשם ידנית</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums text-brand-dark">{fmt(order.setup_total)}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-brand-pink">
                  {fmt(order.monthly_total)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  {order.status === "live" && order.days_to_live !== null ? (
                    <span className="mt-1 block text-[11px] text-brand-muted">
                      עלה לאוויר תוך {order.days_to_live} ימים
                    </span>
                  ) : stalling ? (
                    <span className="mt-1 block text-[11px] font-semibold text-amber-700">
                      פתוחה {openDays} ימים
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-left">
                  <Link
                    href={`/he/agent/orders/${order.id}`}
                    className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-muted transition-colors hover:bg-brand-tint hover:text-brand-pink"
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
