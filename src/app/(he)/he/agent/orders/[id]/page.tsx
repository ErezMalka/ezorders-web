import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { OrderStatusControl } from "@/components/agent/OrderStatusControl";
import { getOrder } from "@/lib/agent/orders";
import { requireAgentSession } from "@/lib/agent/session";
import { ORDER_STATUS, heDate, heDateTime } from "@/lib/agent/status";
import { fmt, fmtExact } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הזמנה - ezorders",
  robots: { index: false, follow: false },
};

const EVENT_LABEL: Record<string, string> = {
  created: "ההזמנה נוצרה",
  setup_started: "ההקמה התחילה",
  went_live: "עלה לאוויר",
  cancelled: "ההזמנה בוטלה",
  status_changed: "הסטטוס שונה",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className="text-sm font-medium text-brand-dark">{value}</span>
    </div>
  );
}

export default async function AgentOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAgentSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const acceptance = order.acceptance;

  return (
    <AgentShell
      session={session}
      active="/he/agent/orders"
      title={`הזמנה ${order.order_number}`}
      lead={order.customer_name}
      action={
        <Link
          href="/he/agent/orders"
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey"
        >
          ← לכל ההזמנות
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-brand-dark">הלקוח</h2>
            <Row label="שם" value={order.customer_name} />
            {order.customer_contact ? <Row label="איש קשר" value={order.customer_contact} /> : null}
            {order.customer_phone ? <Row label="טלפון" value={order.customer_phone} /> : null}
            {order.customer_email ? <Row label="אימייל" value={order.customer_email} /> : null}
            {order.customer_tax_id ? <Row label="ח.פ." value={order.customer_tax_id} /> : null}
            <Row label="סוכן" value={order.agent_name} />
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-brand-dark">מה נמכר</h2>
              <Link
                href={`/he/agent/quotes/${order.quote_id}`}
                className="text-xs font-semibold text-brand-pinkInk hover:underline"
              >
                {order.quote_number} — להצעה המקורית ←
              </Link>
            </div>
            <Row label="הקמה חד־פעמית" value={fmt(order.setup_total)} />
            <Row label="חודשי" value={fmt(order.monthly_total)} />
            {Number(order.discount_percent) > 0 ? (
              <Row
                label="הנחה"
                value={`${Number(order.discount_percent)}% — ${fmt(order.discount_amount)} לחודש`}
              />
            ) : null}
            <p className="pt-2 text-xs text-brand-muted">כל המחירים אינם כוללים מע״מ.</p>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-brand-dark">האישור</h2>
            {acceptance?.channel === "customer" ? (
              <>
                <Row label="אושר על ידי" value={acceptance.signer_name ?? "—"} />
                {acceptance.signer_role ? <Row label="תפקיד" value={acceptance.signer_role} /> : null}
                {acceptance.signer_tax_id ? <Row label="ח.פ. שהוזן" value={acceptance.signer_tax_id} /> : null}
                {acceptance.signer_email ? <Row label="אימייל" value={acceptance.signer_email} /> : null}
                {acceptance.signer_phone ? <Row label="טלפון" value={acceptance.signer_phone} /> : null}
                <Row label="מועד" value={heDateTime.format(new Date(acceptance.created_at))} />
                <Row label="כתובת IP" value={<span dir="ltr">{acceptance.ip ?? "—"}</span>} />
                <div className="mt-3 rounded-xl bg-brand-grey px-3 py-2">
                  <p className="text-[11px] font-semibold text-brand-muted">
                    חתימת המסמך (SHA-256)
                  </p>
                  <p dir="ltr" className="mt-1 break-all font-mono text-[10px] leading-relaxed text-brand-muted">
                    {acceptance.document_hash ?? "—"}
                  </p>
                  <p className="mt-2 text-[11px] text-brand-muted">
                    מזהה את המסמך המדויק שהלקוח אישר. אם ההצעה תשוחזר והחתימה תצא זהה — זה בדיוק
                    מה שנחתם.
                  </p>
                </div>
              </>
            ) : acceptance?.channel === "agent" ? (
              <div className="rounded-xl bg-amber-50 px-3 py-3 text-xs text-amber-800">
                <p className="font-semibold">נרשם ידנית על ידי {order.recorded_by_name ?? "סוכן"}</p>
                <p className="mt-1">
                  הלקוח אישר מחוץ למערכת ({heDateTime.format(new Date(acceptance.created_at))}), ולכן
                  אין כאן חתימה או תיעוד דפדפן — רק העדות של הסוכן.
                </p>
                {acceptance.reason ? <p className="mt-2">הערה: {acceptance.reason}</p> : null}
              </div>
            ) : (
              <p className="text-xs text-brand-muted">אין רישום אישור להזמנה הזו.</p>
            )}
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-brand-dark">יומן</h2>
            <ol className="space-y-2">
              {order.events.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-4 text-xs">
                  <span className="font-medium text-brand-dark">
                    {EVENT_LABEL[event.event_type] ?? event.event_type}
                  </span>
                  <span className="tabular-nums text-brand-muted">
                    {heDateTime.format(new Date(event.created_at))}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <OrderStatusControl
            orderId={order.id}
            status={order.status}
            targetLiveOn={order.target_live_on}
            cancelReason={order.cancel_reason}
          />

          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-brand-dark">ציר זמן</h2>
            <Row label="אושרה" value={heDate.format(new Date(order.accepted_at))} />
            {order.setup_started_at ? (
              <Row label="הקמה החלה" value={heDate.format(new Date(order.setup_started_at))} />
            ) : null}
            {order.target_live_on ? (
              <Row label="יעד לאוויר" value={heDate.format(new Date(order.target_live_on))} />
            ) : null}
            {order.went_live_at ? (
              <Row label="עלה לאוויר" value={heDate.format(new Date(order.went_live_at))} />
            ) : null}
            {order.status !== "live" && order.status !== "cancelled" ? (
              <p className="pt-2 text-xs text-brand-muted">
                פתוחה{" "}
                {Math.floor((Date.now() - new Date(order.accepted_at).getTime()) / 86_400_000)} ימים
              </p>
            ) : null}
          </div>

          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-brand-dark">מצב</h2>
            <p className="text-xs text-brand-muted">
              {ORDER_STATUS[order.status].label}
              {order.status === "cancelled" && order.cancel_reason
                ? ` — ${order.cancel_reason}`
                : ""}
            </p>
          </div>
        </aside>
      </div>
    </AgentShell>
  );
}
