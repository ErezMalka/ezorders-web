import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { OrdersTable } from "@/components/agent/OrdersTable";
import { listOrders } from "@/lib/agent/orders";
import { requireAgentSession } from "@/lib/agent/session";
import { fmt } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הזמנות - ezorders",
  robots: { index: false, follow: false },
};

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-brand-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
          accent ? "text-emerald-700" : "text-brand-dark"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-brand-muted">{sub}</p>
    </div>
  );
}

export default async function AgentOrdersPage() {
  const session = await requireAgentSession();
  const orders = await listOrders();

  const open = orders.filter((o) => o.status === "pending_setup" || o.status === "in_setup");
  const live = orders.filter((o) => o.status === "live");
  const liveMonthly = live.reduce((sum, o) => sum + Number(o.monthly_total), 0);

  // Only orders that actually reached go-live have a duration, which is what
  // keeps this figure honest rather than flattered by everything still open.
  const withDuration = live.filter((o) => o.days_to_live !== null);
  const avgDays =
    withDuration.length > 0
      ? Math.round(withDuration.reduce((s, o) => s + (o.days_to_live ?? 0), 0) / withDuration.length)
      : null;

  return (
    <AgentShell
      session={session}
      active="/he/agent/orders"
      title="הזמנות"
      lead={session.isManager ? "כל ההזמנות שנסגרו, מכל הסוכנים" : "הצעות שהלקוח אישר"}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="בהקמה" value={String(open.length)} sub="אושרו, עדיין לא באוויר" />
        <Tile label="פעילים" value={String(live.length)} sub="לקוחות שעובדים בפועל" />
        <Tile label="חודשי פעיל" value={fmt(liveMonthly)} sub="הכנסה חוזרת מהזמנות חיות" accent />
        <Tile
          label="זמן הקמה ממוצע"
          value={avgDays === null ? "—" : `${avgDays} ימים`}
          sub={
            avgDays === null
              ? "יימדד אחרי ההקמה הראשונה"
              : `מ־${withDuration.length} הקמות שהושלמו`
          }
        />
      </div>

      <section className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
        <OrdersTable
          orders={orders}
          showAgent={session.isManager}
          emptyMessage="עדיין אין הזמנות — הן ייווצרו כשלקוח יאשר הצעה"
        />
      </section>
    </AgentShell>
  );
}
