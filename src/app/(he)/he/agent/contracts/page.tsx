import type { Metadata } from "next";
import Link from "next/link";

import { AgentShell } from "@/components/agent/AgentShell";
import { CONTRACT_STATUS_LABEL, listContracts, type ContractStatus } from "@/lib/agent/contracts";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הסכמים - ezorders",
  robots: { index: false, follow: false },
};

const TONE: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-brand-tint text-brand-pink",
  viewed: "bg-amber-50 text-amber-700",
  signed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400",
};

const DATE = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function AgentContractsPage() {
  const session = await requireAgentSession();
  const contracts = await listContracts();

  return (
    <AgentShell
      session={session}
      active="/he/agent/contracts"
      title="הסכמים"
      lead="מה נשלח לחתימה, מה נפתח, ומה כבר חתום"
    >
      {contracts.length === 0 ? (
        <p className="rounded-card border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-brand-muted">
          עדיין אין הסכמים. הסכם מופק מהצעת מחיר שנשלחה — היכנסו להצעה ולחצו ״הפקת הסכם״.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-brand-grey text-xs text-brand-muted">
                  <th className="px-4 py-3 text-right font-semibold">מספר</th>
                  <th className="px-4 py-3 text-right font-semibold">לקוח</th>
                  <th className="px-4 py-3 text-right font-semibold">מצב</th>
                  <th className="px-4 py-3 text-right font-semibold">נצפה</th>
                  <th className="px-4 py-3 text-right font-semibold">נחתם</th>
                  <th className="px-4 py-3 text-right font-semibold">סוכן</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/he/agent/contracts/${c.id}`}
                        className="font-mono text-xs font-semibold text-brand-pink hover:underline"
                        dir="ltr"
                      >
                        {c.contract_number}
                      </Link>
                      <span className="block font-mono text-[11px] text-brand-muted" dir="ltr">
                        {c.quote_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-dark">{c.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${TONE[c.status]}`}>
                        {CONTRACT_STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-brand-muted">
                      {c.view_count > 0 ? `${c.view_count}×` : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-muted">
                      {c.signed_at ? (
                        <>
                          <span className="tabular-nums">{DATE.format(new Date(c.signed_at))}</span>
                          {c.signer_name ? (
                            <span className="block text-[11px]">{c.signer_name}</span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-muted">{c.agent_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AgentShell>
  );
}
