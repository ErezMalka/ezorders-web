import { fmt } from "@/lib/pricing";
import type { ShowcaseItem } from "@/lib/agent/products";

/**
 * A grid of hardware cards. Shared by the kiosk page and the price page's tabs,
 * because a product should look the same wherever a customer meets it.
 *
 * No client JavaScript: it is a list of objects and their prices, and every
 * interactive version of that is a worse version of that.
 */
export function HardwareGrid({ items }: { items: ShowcaseItem[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm"
        >
          {/* No photo, no frame. An empty 224px box does not read as "no
              picture", it reads as a picture that failed to load — and the
              accessories have never had any. */}
          {item.image ? (
            <div className="flex h-56 items-center justify-center bg-white p-5">
              {/* Fixed-height contain box: the photos arrive at wildly different
                  aspect ratios, and a grid whose cards each crop differently
                  looks like a broken page. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.label}
                loading="lazy"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}
          <div
            className={`flex flex-1 flex-col px-5 py-4 ${
              item.image ? "border-t border-slate-100" : ""
            }`}
          >
            <h4 className="text-base font-bold text-brand-dark">{item.label}</h4>
            {item.note ? (
              <p className="mt-1 text-sm leading-relaxed text-brand-muted">{item.note}</p>
            ) : null}
            <p className="mt-4 text-xl font-bold text-brand-indigo">{fmt(item.setup)}</p>
            <p className="text-xs text-brand-muted">תשלום חד־פעמי, לא כולל מע״מ</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Hardware split into its families, in the order the list arrives.
 *
 * The order is the database's: sort_order carries both which family comes first
 * and which product comes first inside it, so this walks the list once and
 * never sorts. A Map preserves insertion order, which is the whole trick.
 */
export function groupByCategory(items: ShowcaseItem[]): Array<[string, ShowcaseItem[]]> {
  const groups = new Map<string, ShowcaseItem[]>();
  for (const item of items) {
    const key = item.category ?? "ציוד נוסף";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}

/** The line that has to appear under every price on the site. */
export function HardwareFootnote() {
  return (
    <p className="text-sm leading-relaxed text-brand-muted">
      המחירים אינם כוללים מע״מ. הובלה למרכז הארץ ₪385 והתקנה ₪385, ומחוץ למרכז לפי מיקום.
      עמדה מסוימת שאינה מופיעה כאן? כנראה שיש לנו אותה — דברו איתנו.
    </p>
  );
}
