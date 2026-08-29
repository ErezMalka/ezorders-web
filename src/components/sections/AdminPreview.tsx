import type { Locale } from "@/data/homeContent";

/**
 * A faithful, hand-built recreation of the EZOrders admin panel — the live
 * orders screen — rendered as HTML rather than a screenshot.
 *
 * Deliberate: a raster capture of the real panel is a fixed desktop-width image
 * that turns unreadable on a phone, carries whatever data the account happened
 * to hold, and cannot be translated. This scales to any viewport, stays sharp,
 * weighs nothing, and reads correctly in both directions.
 *
 * The rows are invented. They mirror the real screen's columns and behaviour so
 * the preview is honest about what the product looks like.
 */

type Channel = "delivery" | "pickup" | "dinein";

type Row = {
  id: number;
  customer: string;
  phone: string;
  channel: Channel;
  total: number;
  time: string;
};

const ROWS: Record<Locale, Row[]> = {
  he: [
    { id: 1042, customer: "דנה לוי", phone: "050-123-4567", channel: "delivery", total: 128, time: "19:42" },
    { id: 1041, customer: "אורי כהן", phone: "052-987-6543", channel: "pickup", total: 74.5, time: "19:38" },
    { id: 1040, customer: "מיכל אברהם", phone: "054-222-8890", channel: "dinein", total: 213, time: "19:31" },
    { id: 1039, customer: "יוסי מזרחי", phone: "053-445-1120", channel: "delivery", total: 96, time: "19:24" },
    { id: 1038, customer: "נועה שרון", phone: "058-330-7712", channel: "pickup", total: 45, time: "19:19" },
  ],
  en: [
    { id: 1042, customer: "Dana Levi", phone: "050-123-4567", channel: "delivery", total: 128, time: "19:42" },
    { id: 1041, customer: "Ori Cohen", phone: "052-987-6543", channel: "pickup", total: 74.5, time: "19:38" },
    { id: 1040, customer: "Michal Abraham", phone: "054-222-8890", channel: "dinein", total: 213, time: "19:31" },
    { id: 1039, customer: "Yossi Mizrahi", phone: "053-445-1120", channel: "delivery", total: 96, time: "19:24" },
    { id: 1038, customer: "Noa Sharon", phone: "058-330-7712", channel: "pickup", total: 45, time: "19:19" },
  ],
};

const T = {
  he: {
    eyebrow: "מסך ההזמנות",
    heading: "כל ההזמנות. מסך אחד.",
    lead: "משלוחים, איסוף עצמי וישיבה במקום — מכל הערוצים, בזמן אמת, עם סטטוס לכל הזמנה.",
    tabs: ["הכל", "פעיל", "בהמתנה", "הושלם"],
    activeTab: "פעיל",
    cols: { id: "מספר", customer: "לקוח", phone: "טלפון", channel: "ערוץ", total: "סכום", time: "שעה", status: "סטטוס" },
    channels: { delivery: "משלוח", pickup: "איסוף עצמי", dinein: "ישיבה במקום" },
    status: "הזמנה נכנסת",
    summary: { orders: "הזמנות היום", revenue: "מחזור", avg: "ממוצע להזמנה" },
    live: "מתעדכן בזמן אמת",
    note: "התצוגה להמחשה. הנתונים בדויים.",
  },
  en: {
    eyebrow: "The orders screen",
    heading: "Every order. One screen.",
    lead: "Delivery, pickup and dine-in — every channel, in real time, with a status on each order.",
    tabs: ["All", "Active", "Pending", "Done"],
    activeTab: "Active",
    cols: { id: "No.", customer: "Customer", phone: "Phone", channel: "Channel", total: "Total", time: "Time", status: "Status" },
    channels: { delivery: "Delivery", pickup: "Pickup", dinein: "Dine-in" },
    status: "New order",
    summary: { orders: "Orders today", revenue: "Revenue", avg: "Average order" },
    live: "Updating live",
    note: "Illustrative preview. Data is fictional.",
  },
} as const;

function ChannelIcon({ channel }: { channel: Channel }) {
  const paths: Record<Channel, string> = {
    delivery: "M3 16V8h10v8M13 11h4l4 3v2h-2M5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
    pickup: "M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2",
    dinein: "M6 3v8a2 2 0 002 2v8M18 3v18M15 3v6a3 3 0 003 3",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[channel]} />
    </svg>
  );
}

/** The panel's own top bar: brand at the inline-start, signed-in user at the end. */
function PanelChrome({ locale }: { locale: Locale }) {
  const items = locale === "he"
    ? ["בית", "הזמנות", "דוחות", "הגדרות"]
    : ["Home", "Orders", "Reports", "Settings"];
  const active = items[1];

  return (
    <div className="border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-brand-indigo">
          EZ<span className="text-brand-pinkInk">Orders.</span>
        </span>
        <nav className="hidden items-center gap-5 text-xs font-medium sm:flex">
          {items.map((item) => (
            <span
              key={item}
              className={
                item === active
                  ? "border-b-2 border-brand-pink pb-1 text-brand-dark"
                  : "pb-1 text-brand-muted"
              }
            >
              {item}
            </span>
          ))}
        </nav>
        <span className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-pink to-brand-indigo" />
          <span className="hidden text-xs font-medium text-brand-muted sm:inline">
            {locale === "he" ? "מסעדת השדרה" : "The Avenue"}
          </span>
        </span>
      </div>
    </div>
  );
}

export function AdminPreview({ locale = "he" }: { locale?: Locale }) {
  const t = T[locale];
  const rows = ROWS[locale];
  const dir = locale === "he" ? "rtl" : "ltr";

  const revenue = rows.reduce((sum, r) => sum + r.total, 0);
  const money = (n: number) =>
    `₪${n.toLocaleString(locale === "he" ? "he-IL" : "en-US", {
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;

  const summary = [
    { label: t.summary.orders, value: String(rows.length + 33) },
    { label: t.summary.revenue, value: money(revenue * 7) },
    { label: t.summary.avg, value: money(Math.round((revenue / rows.length) * 100) / 100) },
  ];

  return (
    <section dir={dir} className="mx-auto max-w-container px-6 py-20">
      <p className="mb-2 text-sm font-medium text-brand-pinkInk">{t.eyebrow}</p>
      <h2 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{t.heading}</h2>
      <p className="mt-4 max-w-2xl text-lg text-brand-muted">{t.lead}</p>

      {/* Browser frame, so the preview reads as a product and not as a table */}
      <div className="mt-10 overflow-hidden rounded-card bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-b border-black/5 bg-brand-grey px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          </span>
          <span
            dir="ltr"
            className="mx-auto rounded-pill bg-white px-3 py-1 text-[11px] text-brand-muted ring-1 ring-black/5"
          >
            admin.ezorders.com
          </span>
        </div>

        <PanelChrome locale={locale} />

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-px bg-black/5">
          {summary.map((s) => (
            <div key={s.label} className="bg-white px-4 py-4 text-center">
              <p className="text-lg font-bold tabular-nums text-brand-dark sm:text-2xl">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-brand-muted sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-black/5 px-4 py-3">
          {t.tabs.map((tab) => (
            <span
              key={tab}
              className={`shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-semibold ${
                tab === t.activeTab
                  ? "bg-brand-indigo text-white"
                  : "bg-brand-grey text-brand-muted"
              }`}
            >
              {tab}
            </span>
          ))}
          <span className="ms-auto hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-brand-muted sm:flex">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t.live}
          </span>
        </div>

        {/* Rows. A table below sm would need side-scrolling, so it becomes cards. */}
        <ul className="divide-y divide-black/5 sm:hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-dark">{r.customer}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted">
                  <ChannelIcon channel={r.channel} />
                  {t.channels[r.channel]}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{r.time}</span>
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-sm font-bold tabular-nums text-brand-pinkInk">{money(r.total)}</p>
                <p className="mt-0.5 text-[11px] text-brand-muted">#{r.id}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-grey text-xs font-semibold text-brand-muted">
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.id}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.customer}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.phone}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.channel}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.time}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.total}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t.cols.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 tabular-nums text-brand-muted">#{r.id}</td>
                  <td className="px-4 py-3 font-medium text-brand-dark">{r.customer}</td>
                  <td dir="ltr" className="px-4 py-3 text-start tabular-nums text-brand-muted">{r.phone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-brand-muted">
                      <ChannelIcon channel={r.channel} />
                      {t.channels[r.channel]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-brand-muted">{r.time}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-brand-pinkInk">{money(r.total)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-pinkInk">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-pink" aria-hidden="true" />
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-brand-muted">{t.note}</p>
    </section>
  );
}
