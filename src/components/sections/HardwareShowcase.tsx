import { fmt } from "@/lib/pricing";
import type { ShowcaseItem } from "@/lib/agent/products";

/**
 * The kiosks, with their prices.
 *
 * Server-rendered, no client JavaScript: it is a list of objects and their
 * prices, and every interactive version of that is a worse version of that.
 *
 * Grouped by category rather than sorted by price. Someone shopping is first
 * deciding whether they want a credit kiosk, a cash kiosk or a counter unit —
 * three different things that happen to overlap in price — and only then which
 * one. A single price-ordered list interleaves them and answers neither
 * question.
 */

const VAT_NOTE = "המחירים אינם כוללים מע״מ";

export function HardwareShowcase({ items }: { items: ShowcaseItem[] }) {
  // Nothing to show is not an empty state — it is a section that does not
  // exist. A heading over a blank grid reads as a broken page.
  if (items.length === 0) return null;

  const groups = new Map<string, ShowcaseItem[]>();
  for (const item of items) {
    const key = item.category ?? "נוסף";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  return (
    <section dir="rtl" className="bg-brand-grey py-20">
      <div className="mx-auto max-w-container px-6">
        <span className="mb-3 inline-block font-semibold text-brand-pink">החומרה</span>
        <h2 className="mb-3 text-3xl font-bold text-brand-dark sm:text-4xl">
          העמדות עצמן, והמחיר שלהן
        </h2>
        <p className="mb-12 max-w-2xl leading-relaxed text-brand-muted">
          כל עמדה מגיעה מותקנת ומחוברת למערכת ההזמנות — לא ארגז שמגיע במשלוח. בחרו את הגודל
          ואת סוג התשלום שמתאימים לכם, ואנחנו נדאג לשאר.
        </p>

        {[...groups.entries()].map(([category, group]) => (
          <div key={category} className="mb-12 last:mb-0">
            <h3 className="mb-5 text-lg font-bold text-brand-dark">{category}</h3>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm"
                >
                  {/* No photo, no frame. An empty 224px box is not a product
                      shot with nothing in it — it reads as an image that failed
                      to load, and the accessories have never had photos. */}
                  {item.image ? (
                    <div className="flex h-56 items-center justify-center bg-white p-5">
                      {/* Fixed-height contain box: the photos arrive at wildly
                          different aspect ratios, and a grid whose cards each
                          crop differently looks like a broken page.
                          eslint-disable-next-line @next/next/no-img-element */}
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
          </div>
        ))}

        <div className="mt-10 rounded-card border border-slate-200 bg-white px-6 py-5">
          <p className="text-sm leading-relaxed text-brand-muted">
            {VAT_NOTE}. הובלה למרכז הארץ ₪385 והתקנה ₪385, ומחוץ למרכז לפי מיקום. עמדה מסוימת
            שאינה מופיעה כאן? כנראה שיש לנו אותה — דברו איתנו.
          </p>
          <a
            href="/he/contact"
            className="mt-4 inline-block rounded-pill bg-brand-pink px-7 py-3 font-semibold text-white transition-colors hover:bg-brand-pinkDark"
          >
            דברו איתנו על עמדה
          </a>
        </div>
      </div>
    </section>
  );
}
