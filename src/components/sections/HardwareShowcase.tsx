import type { ShowcaseItem } from "@/lib/agent/products";

import { HardwareFootnote, HardwareGrid, groupByCategory } from "./HardwareGrid";

/**
 * The kiosks and their prices, at the bottom of the kiosk page.
 *
 * The same products appear on /he/price behind tabs. Both, deliberately: this
 * page argues for a kiosk, and someone who has just been convinced should not
 * have to go looking for the price — while the price page is where anyone who
 * skipped the argument goes first.
 */
export function HardwareShowcase({ items }: { items: ShowcaseItem[] }) {
  // Nothing to show is not an empty state — it is a section that does not
  // exist. A heading over a blank grid reads as a broken page.
  if (items.length === 0) return null;

  return (
    <section dir="rtl" className="bg-brand-grey py-20">
      <div className="mx-auto max-w-container px-6">
        <span className="mb-3 inline-block font-semibold text-brand-pinkInk">החומרה</span>
        <h2 className="mb-3 text-3xl font-bold text-brand-dark sm:text-4xl">
          העמדות עצמן, והמחיר שלהן
        </h2>
        <p className="mb-12 max-w-2xl leading-relaxed text-brand-muted">
          כל עמדה מגיעה מותקנת ומחוברת למערכת ההזמנות — לא ארגז שמגיע במשלוח. בחרו את הגודל
          ואת סוג התשלום שמתאימים לכם, ואנחנו נדאג לשאר.
        </p>

        {groupByCategory(items).map(([category, group]) => (
          <div key={category} className="mb-12 last:mb-0">
            <h3 className="mb-5 text-lg font-bold text-brand-dark">{category}</h3>
            <HardwareGrid items={group} />
          </div>
        ))}

        <div className="mt-10 rounded-card border border-slate-200 bg-white px-6 py-5">
          <HardwareFootnote />
          <a
            href="/he/contact"
            className="mt-4 inline-block rounded-pill bg-brand-pinkStrong px-7 py-3 font-semibold text-white transition-colors hover:bg-brand-pinkInk"
          >
            דברו איתנו על עמדה
          </a>
        </div>
      </div>
    </section>
  );
}
