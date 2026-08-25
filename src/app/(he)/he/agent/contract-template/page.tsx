import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { TemplateApproval } from "@/components/agent/TemplateApproval";
import { listTemplates } from "@/lib/agent/contracts";
import { requireAdminSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "נוסח ההסכם - ezorders",
  robots: { index: false, follow: false },
};

const DATE = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

/** **bold** in a clause, the way the document renders it. */
function clause(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>
  );
}

export default async function ContractTemplatePage() {
  const session = await requireAdminSession();
  const templates = await listTemplates();
  const current = templates.find((t) => t.is_current) ?? templates[0] ?? null;

  return (
    <AgentShell
      session={session}
      active="/he/agent/contract-template"
      title="נוסח ההסכם"
      lead="הטקסט שהלקוח חותם עליו. משתנה בגרסאות — הסכם חתום ממשיך להצביע על הגרסה שנחתמה"
    >
      {!current ? (
        <p className="rounded-card border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-brand-muted">
          אין עדיין נוסח הסכם במערכת.
        </p>
      ) : (
        <div className="space-y-5">
          <TemplateApproval version={current.version} approved={current.is_approved} />

          <section className="rounded-card border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-brand-dark">{current.title}</h2>
              <span className="text-xs text-brand-muted">
                גרסה {current.version} · נוצרה {DATE.format(new Date(current.created_at))}
                {current.approved_at ? ` · אושרה ${DATE.format(new Date(current.approved_at))}` : ""}
              </span>
            </div>

            {current.notes ? (
              <p className="mb-6 rounded-xl bg-brand-grey px-4 py-3 text-xs text-brand-muted">
                {current.notes}
              </p>
            ) : null}

            <div className="space-y-7">
              {current.sections.map((section) => (
                <div key={section.num}>
                  <h3 className="mb-3 border-b border-slate-100 pb-1.5 text-sm font-bold text-brand-dark">
                    {section.num}&nbsp;&nbsp;{section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.clauses.map((c) => (
                      <div key={c.num} className="flex gap-3">
                        <span className="w-9 shrink-0 text-xs font-semibold text-brand-muted" dir="ltr">
                          {c.num}
                        </span>
                        <p className="flex-1 text-[13px] leading-relaxed text-brand-dark">
                          {clause(c.text)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {templates.length > 1 ? (
            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-brand-dark">גרסאות קודמות</h2>
              <ul className="space-y-1.5 text-sm text-brand-muted">
                {templates
                  .filter((t) => !t.is_current)
                  .map((t) => (
                    <li key={t.version}>
                      גרסה {t.version} · {DATE.format(new Date(t.created_at))}
                      {t.is_approved ? " · אושרה" : " · לא אושרה"}
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-brand-muted">
                גרסאות ישנות נשארות במערכת ולא נמחקות. כל הסכם חתום מצביע על הגרסה שלפיה נחתם,
                ולכן ימשיך להציג בדיוק את הטקסט שעליו חתמו.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </AgentShell>
  );
}
