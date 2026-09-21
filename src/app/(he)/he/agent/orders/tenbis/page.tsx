import Link from "next/link";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { requireAgentSession } from "@/lib/agent/session";
import { heDate } from "@/lib/agent/status";
import { listTenbisProvisioning, tenbisEnabled } from "@/lib/agent/tenbis";
import type { TenbisState } from "@/lib/agent/tenbis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הקמות תן ביס - ezorders",
  robots: { index: false, follow: false },
};

/**
 * What we have sold, and what we have actually delivered.
 *
 * Before this there was nowhere to ask: the sale is in this portal, the
 * onboarding task is in the CRM, and the credentials reach the operational
 * system by hand — so an integration paid for four months ago and never
 * connected looked exactly like one sold yesterday. Everything on this screen
 * exists to tell those two apart.
 */

const STATE: Record<TenbisState, { label: string; tone: string; blocked: "us" | "them" | "none" }> = {
  failed:     { label: "נדחה",           tone: "border-rose-200 bg-rose-50 text-rose-900",          blocked: "us" },
  entered:    { label: "ממתין לבדיקה",   tone: "border-amber-200 bg-amber-50 text-amber-900",       blocked: "us" },
  verified:   { label: "נבדק ועובד",     tone: "border-emerald-200 bg-emerald-50 text-emerald-900", blocked: "us" },
  sold:       { label: "לא התחלנו",      tone: "border-slate-200 bg-slate-50 text-brand-muted",     blocked: "us" },
  instructed: { label: "נשלחו הנחיות",   tone: "border-sky-200 bg-sky-50 text-sky-900",             blocked: "them" },
  delivered:  { label: "הועבר להקמה",    tone: "border-emerald-200 bg-emerald-50 text-emerald-900", blocked: "none" },
};

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-brand-dark">{value}</p>
      <p className="mt-1 text-xs text-brand-muted">{sub}</p>
    </div>
  );
}

/** How long this has been sitting, in the unit a person would say it in. */
function waiting(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "היום";
  if (days === 1) return "יום";
  if (days < 30) return `${days} ימים`;
  const months = Math.floor(days / 30);
  return months === 1 ? "חודש" : `${months} חודשים`;
}

export default async function TenbisProvisioningPage() {
  const session = await requireAgentSession();
  const rows = await listTenbisProvisioning();
  const configured = tenbisEnabled();

  // "Ours" is the number that matters: the work sitting on our side of the
  // line. Anything waiting on a customer is not something this screen is
  // asking anybody to do today.
  const ours = rows.filter((r) => STATE[r.state].blocked === "us");
  const theirs = rows.filter((r) => STATE[r.state].blocked === "them");
  const done = rows.filter((r) => r.state === "delivered");

  return (
    <AgentShell
      session={session}
      active="/he/agent/orders"
      title="הקמות תן ביס"
      lead="מה נמכר, ומה כבר עובד"
      action={
        <Link
          href="/he/agent/orders"
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey"
        >
          ← לכל ההזמנות
        </Link>
      }
    >
      {!configured ? (
        <p className="mb-5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          החיבור לתן ביס אינו מוגדר במערכת (<code className="rounded bg-white px-1">TENBIS_ENC_KEY</code>).
          הרשימה מוצגת, אך לא ניתן לשמור או לבדוק פרטים.
        </p>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Tile label="ממתין לנו" value={String(ours.length)} sub="שורות שאפשר לקדם עכשיו" />
        <Tile label="ממתין ללקוח" value={String(theirs.length)} sub="נשלחו הנחיות וטרם חזרו" />
        <Tile label="הועברו להקמה" value={String(done.length)} sub="מתוך סך הכל נמכרו" />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-slate-200 bg-white p-8 text-center text-sm text-brand-muted">
          אין עדיין הזמנות שכוללות תן ביס.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-right">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-brand-muted">
                <th className="px-4 py-3 font-medium">לקוח</th>
                <th className="px-4 py-3 font-medium">הזמנה</th>
                <th className="px-4 py-3 font-medium">מצב</th>
                <th className="px-4 py-3 font-medium">ממתין</th>
                <th className="px-4 py-3 font-medium">נמכר</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATE[r.state];
                // Time is only interesting where somebody is waiting on it.
                // On a delivered row it is trivia, and on a fresh one it is
                // noise — what earns the column is an integration that has sat
                // untouched since it was paid for.
                const since = r.state === "delivered" ? null : waiting(r.accepted_at);
                return (
                  <tr key={r.order_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/he/agent/orders/${r.order_id}`}
                        className="text-sm font-semibold text-brand-dark hover:underline"
                      >
                        {r.customer_name}
                      </Link>
                      {r.last_error ? (
                        <p className="mt-0.5 max-w-[42ch] truncate text-xs text-rose-700" title={r.last_error}>
                          {r.last_error}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-brand-muted">{r.order_number}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-pill border px-3 py-1 text-xs font-semibold ${s.tone}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted">{since ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-brand-muted">
                      {heDate.format(new Date(r.accepted_at))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AgentShell>
  );
}
