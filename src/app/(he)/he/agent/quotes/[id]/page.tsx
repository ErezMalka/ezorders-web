import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { CloseQuoteButton } from "@/components/agent/CloseQuoteButton";
import { CreateContractButton } from "@/components/agent/CreateContractButton";
import { QuoteActions } from "@/components/agent/QuoteActions";
import { getOrderForQuote } from "@/lib/agent/orders";
import { getQuote, getQuotePriceChanges } from "@/lib/agent/quotes";
import { requireAgentSession } from "@/lib/agent/session";
import { ORDER_STATUS, QUOTE_STATUS, heDate } from "@/lib/agent/status";
import { BASE_SETUP_LABEL, GROUP_LABELS, fmt, type ItemGroup } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הצעת מחיר - ezorders",
  robots: { index: false, follow: false },
};

const GROUP_ORDER: ItemGroup[] = ["core", "addon_included", "addon_excluded", "integrations", "mobile_app", "hardware"];

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
  // Every price the agent set by hand, oldest first. Empty for a list-priced quote.
  const priceChanges = quote.price_overridden ? await getQuotePriceChanges(quote.id) : [];
  // What the list said for the base fee, as recorded when the agent changed it.
  const listBaseSetup =
    [...priceChanges].reverse().find((c) => c.field === "base_setup")?.list_value ?? null;

  const status = QUOTE_STATUS[quote.status];
  const hardwareTotal = Number(quote.hardware_total ?? 0);

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
                          <td className="px-4 py-2.5 text-brand-dark">
                            {item.label}
                            {item.price_overridden ? (
                              <span className="ms-2 rounded-pill bg-brand-pinkStrong px-2 py-0.5 text-[10px] font-bold text-white">
                                מחיר ידני
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">{item.quantity}</td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {fmt(Number(item.setup_total))}
                            <ListPrice
                              unit={Number(item.setup_unit)}
                              list={item.list_setup_unit}
                              qty={item.quantity}
                            />
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {fmt(Number(item.monthly_total))}
                            <ListPrice
                              unit={Number(item.monthly_unit)}
                              list={item.list_monthly_unit}
                              qty={item.quantity}
                            />
                          </td>
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

          {/* The trail. Shown only where there is one — a list-priced quote has
              nothing to account for, and a heading over nothing invites a question. */}
          {quote.price_overridden ? (
            <section className="rounded-card border border-brand-pink/40 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-brand-dark">מחירים ידניים</h2>
                <span className="text-xs text-brand-muted">
                  {quote.price_alert_sent_at
                    ? `התראה נשלחה למנהל ${heDate.format(new Date(quote.price_alert_sent_at))}`
                    : "התראה תישלח למנהל בשליחה ללקוח"}
                </span>
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {quote.base_setup_override !== null ? (
                  <Detail
                    label={BASE_SETUP_LABEL}
                    value={`${fmt(Number(quote.base_setup_override))}${
                      listBaseSetup !== null ? ` (מחירון ${fmt(Number(listBaseSetup))})` : ""
                    }`}
                  />
                ) : null}
                {quote.discount_override_pct !== null ? (
                  <Detail label="הנחה" value={`${Number(quote.discount_override_pct)}% במקום המדרגה האוטומטית`} />
                ) : null}
              </dl>
              {priceChanges.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-brand-grey text-brand-muted">
                        <th className="px-3 py-2 text-right font-semibold">מתי</th>
                        <th className="px-3 py-2 text-right font-semibold">מה</th>
                        <th className="px-3 py-2 text-right font-semibold">מחירון</th>
                        <th className="px-3 py-2 text-right font-semibold">נקבע</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceChanges.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="px-3 py-1.5 tabular-nums text-brand-muted">
                            {heDate.format(new Date(c.at))}
                          </td>
                          <td className="px-3 py-1.5 text-brand-dark">
                            {c.field === "base_setup"
                              ? BASE_SETUP_LABEL
                              : c.field === "discount_pct"
                                ? "הנחה"
                                : `${c.label ?? c.component_key} — ${c.field === "setup_unit" ? "הקמה ליח׳" : "חודשי ליח׳"}`}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums text-brand-muted">
                            {c.field === "discount_pct" ? `${Number(c.list_value ?? 0)}%` : fmt(Number(c.list_value ?? 0))}
                          </td>
                          <td className="px-3 py-1.5 font-semibold tabular-nums text-brand-pinkDark">
                            {c.field === "discount_pct" ? `${Number(c.new_value)}%` : fmt(Number(c.new_value))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
            <div className="bg-brand-dark px-5 py-4 text-white">
              <h2 className="text-sm font-bold">סיכום</h2>
            </div>
            <div className="px-5 py-4 text-sm">
              {quote.price_overridden ? (
                <p className="mb-3 rounded-xl bg-brand-tint px-3 py-2 text-center text-xs font-semibold text-brand-pinkDark">
                  הצעה עם מחיר ידני
                </p>
              ) : null}
              <SummaryRow label="סה״כ הקמה" value={fmt(Number(quote.setup_total))} emphasis />

              {hardwareTotal > 0 ? (
                <>
                  <div className="my-3 h-px bg-slate-100" />
                  <SummaryRow label="מוצרים וחומרה" value={fmt(hardwareTotal)} emphasis />
                </>
              ) : null}

              <div className="my-3 h-px bg-slate-100" />

              <SummaryRow label="חודשי זכאי" value={fmt(Number(quote.monthly_eligible))} />
              {Number(quote.discount_percent) > 0 ? (
                <SummaryRow
                  label={`הנחה ${quote.discount_percent}%${quote.discount_override_pct !== null ? " (ידני)" : ""}`}
                  value={`−${fmt(Number(quote.discount_amount))}`}
                  good
                />
              ) : null}
              {Number(quote.monthly_non_eligible) > 0 ? (
                <SummaryRow label="ללא הנחה" value={`+${fmt(Number(quote.monthly_non_eligible))}`} faint />
              ) : null}
              <SummaryRow label="סה״כ חודשי" value={fmt(Number(quote.monthly_total))} emphasis />

              <p className="mt-3 text-center text-xs text-brand-muted">
                כל המחירים אינם כוללים מע״מ.
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

          {/* A contract restates terms the customer has already been shown, so
              it is offered from the moment the quote is out and not before. */}
          {quote.status === "sent" || quote.status === "viewed" || quote.status === "accepted" ? (
            <div className="rounded-card border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-brand-dark">הסכם לחתימה</h2>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-brand-muted">
                מפיק הסכם עם הפרטים והרכיבים של ההצעה הזו. הלקוח חותם בקישור, והמערכת מתעדת
                מי חתם, מתי ומאיזו כתובת.
              </p>
              <CreateContractButton quoteId={quote.id} />
            </div>
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

/** The list price under a hand-set one, so the two can be read together. */
function ListPrice({ unit, list, qty }: { unit: number; list: number | null; qty: number }) {
  if (list === null || Number(list) === unit) return null;
  return (
    <span className="block text-[11px] text-brand-muted line-through">מחירון {fmt(Number(list) * qty)}</span>
  );
}
