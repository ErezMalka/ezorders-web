import type { Locale } from "@/data/homeContent";

/**
 * Real captures of the EZOrders admin panel, shown in a device frame.
 *
 * Hebrew only, by design: the panel's own UI is Hebrew, so these would read as
 * a foreign product on /en. English pages get <AdminPreview /> instead, which
 * is rebuilt in markup and therefore translates.
 *
 * The captures are anonymised — the account name is replaced and the customer
 * column carries invented names.
 */

export type AdminShot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

export const ADMIN_SHOTS: Record<string, AdminShot> = {
  home: {
    src: "/images/admin/01-home.webp",
    width: 402,
    height: 753,
    alt: "מסך הניהול הראשי של EZOrders עם משתמשים, סניפים, דוחות ומועדון לקוחות",
    caption: "ניהול",
  },
  branch: {
    src: "/images/admin/02-branch.webp",
    width: 411,
    height: 771,
    alt: "דשבורד סניף ב-EZOrders עם סך ההזמנות וההכנסות לתקופה",
    caption: "דשבורד סניף",
  },
  pos: {
    src: "/images/admin/03-pos.webp",
    width: 395,
    height: 754,
    alt: "מסך הקופה של EZOrders עם דוח Z, קבלות, נוכחות ופתיחת מגירה",
    caption: "קופה",
  },
  orders: {
    src: "/images/admin/04-orders.webp",
    width: 407,
    height: 757,
    alt: "רשימת ההזמנות ב-EZOrders עם סטטוס, לקוח וסכום לכל הזמנה",
    caption: "הזמנות",
  },
  report: {
    src: "/images/admin/05-report.webp",
    width: 405,
    height: 758,
    alt: "דוח הזמנות ב-EZOrders עם סך הכל, ממוצע להזמנה ופילוח דרכי תשלום",
    caption: "דוח הזמנות",
  },
};

function Phone({ shot, priority = false }: { shot: AdminShot; priority?: boolean }) {
  return (
    <figure className="m-0 flex w-[210px] shrink-0 flex-col items-center sm:w-[236px]">
      <div className="rounded-[26px] bg-brand-dark p-[6px] shadow-xl">
        <div className="overflow-hidden rounded-[20px] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot.src}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="block h-auto w-full"
          />
        </div>
      </div>
      <figcaption className="mt-3 text-sm font-medium text-brand-muted">
        {shot.caption}
      </figcaption>
    </figure>
  );
}

export function AdminScreens({
  locale = "he",
  keys,
  heading,
  lead,
  eyebrow,
}: {
  locale?: Locale;
  keys: (keyof typeof ADMIN_SHOTS)[];
  heading: string;
  lead: string;
  eyebrow: string;
}) {
  if (locale !== "he") return null;
  const shots = keys.map((k) => ADMIN_SHOTS[k]);

  return (
    <section dir="rtl" className="bg-brand-grey py-20">
      <div className="mx-auto max-w-container px-6">
        <p className="mb-2 text-sm font-medium text-brand-pinkInk">{eyebrow}</p>
        <h2 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{heading}</h2>
        <p className="mt-4 max-w-2xl text-lg text-brand-muted">{lead}</p>
      </div>

      {/* Its own scroller: a row of phones is wider than a phone, and the page
          itself must never scroll sideways. */}
      <div className="mt-12 overflow-x-auto pb-2">
        <div className="mx-auto flex w-max min-w-full items-start justify-center gap-6 px-6">
          {shots.map((s, i) => (
            <Phone key={s.src} shot={s} priority={i === 0} />
          ))}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-container px-6 text-xs text-brand-muted">
        צילומים מהמערכת. שם העסק ופרטי הלקוחות הוחלפו.
      </p>
    </section>
  );
}
