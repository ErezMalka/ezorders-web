import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { CloseQuoteButton } from "@/components/agent/CloseQuoteButton";
import { QuoteActions } from "@/components/agent/QuoteActions";
import { getOrderForQuote } from "@/lib/agent/orders";
import { getQuote } from "@/lib/agent/quotes";
import { requireAgentSession } from "@/lib/agent/session";
import { ORDER_STATUS, QUOTE_STATUS, heDate } from "@/lib/agent/status";
import { GROUP_LABELS, fmt, type ItemGroup } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הצעת מחיר - ezorders",
  robots: { index: false, follow: false },
};

const GROUP_ORDER: ItemGroup[] = ["core", "addon_included", "addon_excluded", "mobile_app", "hardware"];

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAgentSession();

  // RLS decides visibility, so "not found" and "not yours" are the same answer
  // here — which is what we want it to look like from the outside.
  const quote = await getQuote(id);
  if (!quote) notFound();

  // Whether this quote was ever sold. Drives the one decision this screen makes
  // that the quote row alone cannot answer: show the order, or offer to open one.
  const order = await getOrderForQuote(quote.id);

  const status = QUOTE_STATUS[quote.status];
  const hardwareTotal = Number(quote.hardware_total ?? 0);
  const setupVat = (Number(quote.setup_total) * Number(quote.vat_percent)) / 100;
  const hardwareVat = (hardwareTotal * Number(quote.vat_percent)) / 100;
  const monthlyVat = (Number(quote.monthly_total) * Number(quote.vat_percent)) / 100;
  const contractValue =
    Number(quote.setup_total) + hardwareTotal + Number(quote.monthly_total) * quote.term_months;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: quote.items.filter((item) => item.item_group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <AgentShell
      session={session}
      active="/he/agent/quotes"
      title={`הצעת מחיר ${quote.quote_number}`}
      lead={`${quote.customer_name} · נוצרה ${heDate.format(new Date(quote.created_at))}`}
      action={
        <Link
          href="/he/agent/quotes"
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-white"
        >
          ← חזרה לרשימה
        </Link>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-brand-dark">פירוט החבילה</h2>
              <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-grey text-xs text-brand-muted">
                    <th className="px-4 py-3 text-right font-semibold">רכיב</th>
                    <th className="px-4 py-3 text-right font-semibold">כמות</th>
                    <th className="px-4 py-3 text-right font-semibold">הקמה</th>
                    <th className="px-4 py-3 text-right font-semibold">חודשי</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(({ group, items }) => (
                    <Fragment key={group}>
                      <tr className="bg-brand-grey/60">
                        <td colSpan={4} className="px-4 py-2 text-xs font-bold text-brand-muted">
                          {GROUP_LABELS[group]}
                        </td>
                      </tr>
                      {items.map((item) => (
                        <tr key={item.component_key} className="border-b border-slate-100">
                          <td className="px-4 py-2.5 text-brand-dark">{item.label}</td>
                          <td className="px-4 py-2.5 tabular-nums">{item.quantity}</td>
                          <td className="px-4 py-2.5 tabular-nums">{fmt(Number(item.setup_total))}</td>
                          <td className="px-4 py-2.5 tabular-nums">{fmt(Number(item.monthly_total))}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-brand-dark">פרטי הלקוח</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="שם" value={quote.customer_name} />
              <Detail label="איש קשר" value={quote.customer_contact} />
              <Detail label="טלפון" value={quote.customer_phone} ltr />
              <Detail label="אימייל" value={quote.customer_email} ltr />
              <Detail label="ח.פ / ע.מ" value={quote.customer_tax_id} ltr />
              <Detail label="בתוקף עד" value={heDate.format(new Date(quote.valid_until))} />
            </dl>
            {quote.notes ? (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-grey px-4 py-3 text-sm text-brand-muted">
                {quote.notes}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
            <div className="bg-brand-dark px-5 py-4 text-white">
              <h2 className="text-sm font-bold">סיכום</h2>
            </div>
            <div className="px-5 py-4 text-sm">
              <SummaryRow label="סה״כ הקמה" value={fmt(Number(quote.setup_total))} />
              <SummaryRow label={`מע״מ ${quote.vat_percent}%`} value={fmt(setupVat)} faint />
              <SummaryRow label="הקמה כולל מע״מ" value={fmt(Number(quote.setup_total) + setupVat)} emphasis />

              {hardwareTotal > 0 ? (
                <>
                  <div className="my-3 h-px bg-slate-100" />
                  <SummaryRow label="מוצרים וחומרה" value={fmt(hardwareTotal)} />
                  <SummaryRow label={`מע״מ ${quote.vat_percent}%`} value={fmt(hardwareVat)} faint />
                  <SummaryRow label="מוצרים כולל מע״מ" value={fmt(hardwareTotal + hardwareVat)} emphasis />
                </>
              ) : null}

              <div className="my-3 h-px bg-slate-100" />

              <SummaryRow label="חודשי זכאי" value={fmt(Number(quote.monthly_eligible))} />
              {Number(quote.discount_percent) > 0 ? (
                <SummaryRow
                  label={`הנחה ${quote.discount_percent}%`}
                  value={`−${fmt(Number(quote.discount_amount))}`}
                  good
                />
              ) : null}
              {Number(quote.monthly_non_eligible) > 0 ? (
                <SummaryRow label="ללא הנחה" value={`+${fmt(Number(quote.monthly_non_eligible))}`} faint />
              ) : null}
              <SummaryRow label="סה״כ חודשי" value={fmt(Number(quote.monthly_total))} />
              <SummaryRow label={`מע״מ ${quote.vat_percent}%`} value={fmt(monthlyVat)} faint />
              <SummaryRow
                label="חודשי כולל מע״מ"
                value={fmt(Number(quote.monthly_total) + monthlyVat)}
                emphasis
              />

              <p className="mt-3 text-center text-xs text-brand-muted">
                שווי החוזה ל-{quote.term_months} חודשים:{" "}
                <span className="font-semibold text-brand-dark">{fmt(contractValue)}</span>
              </p>
            </div>
          </div>

          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            customerEmail={quote.customer_email}
            publicToken={quote.public_token}
            viewCount={quote.view_count}
            firstViewedAt={quote.first_viewed_at}
          />

          {order ? (
            <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-sm font-bold text-emerald-900">ההצעה נסגרה</h2>
              <p className="mt-1 text-xs text-emerald-800">
                נפתחה הזמנה {order.order_number} — {ORDER_STATUS[order.status].label}.
              </p>
              <Link
                href={`/he/agent/orders/${order.id}`}
                className="mt-3 block w-full rounded-pill bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                מעבר להזמנה
              </Link>
            </div>
          ) : quote.status === "sent" || quote.status === "viewed" ? (
            <CloseQuoteButton quoteId={quote.id} />
          ) : null}
        </aside>
      </div>
    </AgentShell>
  );
}

function Detail({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="font-medium text-brand-dark" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
  faint,
  good,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  faint?: boolean;
  good?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 py-1 ${
        emphasis ? "border-t border-slate-200 pt-2 font-bold text-brand-dark" : "text-xs text-brand-muted"
      } ${faint ? "text-slate-400" : ""} ${good ? "font-semibold text-emerald-700" : ""}`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${emphasis ? "text-brand-pink" : ""}`}>{value}</span>
    </div>
  );
}
