import Link from "next/link";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { OrdersTable } from "@/components/agent/OrdersTable";
import { QuotesTable } from "@/components/agent/QuotesTable";
import { listOrders } from "@/lib/agent/orders";
import { listQuotes } from "@/lib/agent/quotes";
import { requireAgentSession } from "@/lib/agent/session";
import { OPEN_STATUSES } from "@/lib/agent/status";
import { fmt } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "לוח בקרה - ezorders",
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

export default async function AgentDashboardPage() {
  const session = await requireAgentSession();
  const [quotes, orders] = await Promise.all([listQuotes(), listOrders()]);

  const open = quotes.filter((q) => OPEN_STATUSES.includes(q.status));
  const closed = quotes.filter((q) => q.status === "accepted" || q.status === "rejected");

  // Pipeline is measured in recurring revenue, because that is what the business
  // actually runs on — a one-time setup fee flatters the number and then stops.
  const pipelineMonthly = open.reduce((sum, q) => sum + Number(q.monthly_total), 0);

  // Won revenue comes from orders, not from quotes marked accepted. An order
  // that was later cancelled is not revenue, and counting it would make this
  // figure drift upward from what the business actually bills.
  const living = orders.filter((o) => o.status !== "cancelled");
  const live = orders.filter((o) => o.status === "live");
  const inSetup = orders.filter((o) => o.status === "pending_setup" || o.status === "in_setup");
  const wonMonthly = living.reduce((sum, o) => sum + Number(o.monthly_total), 0);
  const liveMonthly = live.reduce((sum, o) => sum + Number(o.monthly_total), 0);

  const winRate = closed.length > 0 ? Math.round((living.length / closed.length) * 100) : 0;

  return (
    <AgentShell
      session={session}
      active="/he/agent"
      title={`שלום, ${session.fullName.split(" ")[0]}`}
      lead={session.isManager ? "תמונת מצב של כל הסוכנים" : "תמונת מצב של ההצעות שלך"}
      action={
        <Link
          href="/he/agent/new"
          className="rounded-pill bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark"
        >
          + הצעה חדשה
        </Link>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="הצעות פתוחות" value={String(open.length)} sub="ממתינות לתשובת הלקוח" />
        <Tile label="חודשי בצבר" value={fmt(pipelineMonthly)} sub="אם כל ההצעות ייסגרו" />
        <Tile
          label="חודשי שנסגר"
          value={fmt(wonMonthly)}
          sub={`${fmt(liveMonthly)} כבר פעיל`}
          accent
        />
        <Tile label="אחוז סגירה" value={`${winRate}%`} sub={`מתוך ${closed.length} הצעות שנסגרו`} />
      </div>

      {inSetup.length > 0 ? (
        <section className="mb-6 overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-brand-dark">
              ממתין להקמה
              <span className="ms-2 rounded-pill bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {inSetup.length}
              </span>
            </h2>
            <Link href="/he/agent/orders" className="text-sm font-semibold text-brand-pink hover:underline">
              לכל ההזמנות ←
            </Link>
          </div>
          <OrdersTable orders={inSetup.slice(0, 5)} showAgent={session.isManager} />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-brand-dark">הצעות אחרונות</h2>
          <Link href="/he/agent/quotes" className="text-sm font-semibold text-brand-pink hover:underline">
            לכל ההצעות ←
          </Link>
        </div>
        <QuotesTable
          quotes={quotes.slice(0, 6)}
          showAgent={session.isManager}
          emptyMessage="עדיין אין הצעות — התחילו מ״הצעה חדשה״"
        />
      </section>
    </AgentShell>
  );
}
