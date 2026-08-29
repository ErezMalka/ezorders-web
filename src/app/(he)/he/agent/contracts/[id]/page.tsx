import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentShell } from "@/components/agent/AgentShell";
import { ContractActions } from "@/components/agent/ContractActions";
import { ContractNotes } from "@/components/agent/ContractNotes";
import {
  CONTRACT_STATUS_LABEL,
  getContract,
  getContractEvents,
  getContractLines,
} from "@/lib/agent/contracts";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הסכם - ezorders",
  robots: { index: false, follow: false },
};

const STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

const EVENT_LABEL: Record<string, string> = {
  created: "נוצר",
  sent: "נשלח",
  opened: "נפתח",
  reopened: "נפתח שוב",
  signed: "נחתם",
  signature_cleared: "חתימה נמחקה",
  cancelled: "בוטל",
};

export default async function AgentContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAgentSession();
  const { id } = await params;

  const contract = await getContract(id);
  if (!contract) notFound();

  const [events, lines] = await Promise.all([
    getContractEvents(id),
    getContractLines(contract.quote_id),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ezorders.com";

  return (
    <AgentShell
      session={session}
      active="/he/agent/contracts"
      title={contract.contract_number}
      lead={`${contract.customer_name} · ${CONTRACT_STATUS_LABEL[contract.status]}`}
    >
      <div className="space-y-5">
        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <ContractActions
            id={contract.id}
            status={contract.status}
            token={contract.public_token}
            siteUrl={siteUrl}
          />
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-brand-dark">פרטים</h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="לקוח" value={contract.customer_name} />
            <Row label="ח.פ / ע.מ" value={contract.customer_tax_id} mono />
            <Row label="איש קשר" value={contract.contact_name} />
            <Row label="טלפון" value={contract.contact_phone} mono />
            <Row label="דוא״ל" value={contract.customer_email} />
            <Row label="גרסת נוסח" value={String(contract.template_version)} mono />
            <Row
              label="הצעת מחיר"
              value={contract.quote_number}
              mono
            />
          </dl>
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-brand-dark">הערות</h2>
          <p className="mb-4 mt-1 text-xs leading-relaxed text-brand-muted">
            הערה לכל שורה, והערות כלליות לכל ההסכם. שתיהן מודפסות בתוך ההסכם שהלקוח חותם עליו
            ונכללות בטביעת המסמך.
          </p>
          <ContractNotes
            id={contract.id}
            status={contract.status}
            lines={lines}
            initialNotes={contract.notes ?? ""}
            initialItemNotes={contract.item_notes ?? {}}
          />
        </section>

        {contract.status === "signed" ? (
          <section className="rounded-card border border-emerald-200 bg-emerald-50/40 p-5">
            <h2 className="mb-4 text-base font-bold text-brand-dark">החתימה</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Row label="חתם" value={contract.signer_name} />
              <Row label="ת.ז / ח.פ" value={contract.signer_id_number} mono />
              <Row label="תפקיד" value={contract.signer_role} />
              <Row
                label="מועד"
                value={contract.signed_at ? STAMP.format(new Date(contract.signed_at)) : null}
                mono
              />
              {/* Null means nobody got a copy. Worth seeing rather than
                  assuming: the signature stands either way, so a failed send
                  is silent unless it is shown. */}
              <Row
                label="עותק במייל"
                value={
                  contract.signed_email_sent_at
                    ? STAMP.format(new Date(contract.signed_email_sent_at))
                    : "לא נשלח"
                }
                mono={Boolean(contract.signed_email_sent_at)}
              />
            </dl>
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-brand-muted">טביעת המסמך (SHA-256)</p>
              <code
                dir="ltr"
                className="block overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-brand-dark"
              >
                {contract.document_hash}
              </code>
              <p className="mt-2 text-xs leading-relaxed text-brand-muted">
                הערך הזה הוא של ההסכם כפי שהוצג לחותם, ללא החתימה וללא נספח הראיות. חישוב חוזר
                של אותו מסמך חייב להחזיר אותו ערך.
              </p>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-brand-dark">מסלול המסמך</h2>
            <p className="text-xs text-brand-muted">
              כל פתיחה וכל חתימה, עם הכתובת והדפדפן שממנו הגיעו. זה מה שמודפס בנספח הראיות.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-brand-grey text-xs text-brand-muted">
                  <th className="px-4 py-3 text-right font-semibold">תאריך ושעה</th>
                  <th className="px-4 py-3 text-right font-semibold">פעולה</th>
                  <th className="px-4 py-3 text-right font-semibold">כתובת IP</th>
                  <th className="px-4 py-3 text-right font-semibold">דפדפן / מכשיר</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 tabular-nums text-brand-dark" dir="ltr">
                      {STAMP.format(new Date(e.at))}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-dark">
                      {EVENT_LABEL[e.event_type] ?? e.event_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-muted" dir="ltr">
                      {e.ip ?? "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-brand-muted">
                      {e.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="px-1 text-xs text-brand-muted">
          <Link href="/he/agent/contracts" className="font-semibold text-brand-pinkInk hover:underline">
            ← חזרה לרשימת ההסכמים
          </Link>
        </p>
      </div>
    </AgentShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-brand-muted">{label}</dt>
      <dd
        className={`text-sm text-brand-dark ${mono ? "font-mono text-xs" : ""}`}
        dir={mono ? "ltr" : undefined}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
