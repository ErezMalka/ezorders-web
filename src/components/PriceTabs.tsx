"use client";

import { useState } from "react";

import { HardwareFootnote, HardwareGrid } from "@/components/sections/HardwareGrid";
import type { ShowcaseItem } from "@/lib/agent/products";

/**
 * The price page's tabs: software first, then a tab per hardware family.
 *
 * The tabs are not a list in this file. They are the distinct categories of
 * whatever hardware the database returns, in the order it returns it — so a
 * product typed 'מדפסות' makes a מדפסות tab appear and nothing here knows the
 * word. Putting the tab list in the code would have meant a deploy per family,
 * which is the thing the catalogue was moved into the database to stop.
 *
 * Every panel is in the HTML and hidden with CSS rather than unmounted. Three
 * reasons, and the first is the important one: a crawler reading this page sees
 * every price, so the hardware is searchable. Switching tabs is then instant,
 * and the calculator does not lose what the visitor ticked when they go and
 * look at a kiosk.
 */

type Locale = "he" | "en";

const COPY = {
  he: {
    software: "תוכנה",
    other: "ציוד נוסף",
    ariaTabs: "מה מתמחר",
    installed: "כל עמדה מגיעה מותקנת ומחוברת למערכת ההזמנות — לא ארגז שמגיע במשלוח.",
    talk: "דברו איתנו על עמדה",
    contactHref: "/he/contact",
  },
  en: {
    software: "Software",
    other: "Other equipment",
    ariaTabs: "What is being priced",
    installed: "Every station arrives installed and connected to the ordering system — not a crate in the post.",
    talk: "Talk to us about a station",
    contactHref: "/en/contact",
  },
} as const;

/** The family a hardware item is shown under, in the page's language. */
function familyOf(item: ShowcaseItem, locale: Locale, other: string): string {
  if (locale === "en") return item.categoryEn ?? item.category ?? other;
  return item.category ?? other;
}

export function PriceTabs({
  hardware,
  locale = "he",
  children,
}: {
  hardware: ShowcaseItem[];
  locale?: Locale;
  /** The calculator. Rendered by the server page and handed in whole. */
  children: React.ReactNode;
}) {
  const t = COPY[locale];
  const SOFTWARE = t.software;
  const families: Array<[string, ShowcaseItem[]]> = [];
  const seen = new Map<string, ShowcaseItem[]>();
  for (const item of hardware) {
    const key = familyOf(item, locale, t.other);
    const bucket = seen.get(key);
    if (bucket) bucket.push(item);
    else {
      const fresh = [item];
      seen.set(key, fresh);
      families.push([key, fresh]);
    }
  }

  const tabs = [SOFTWARE, ...families.map(([name]) => name)];
  const [active, setActive] = useState<string>(SOFTWARE);

  // One tab is not a tab bar. With no hardware the page is what it always was.
  if (families.length === 0) return <>{children}</>;

  return (
    <div dir={locale === "he" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-container px-6">
        <div
          role="tablist"
          aria-label={t.ariaTabs}
          className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
        >
          {tabs.map((tab) => {
            const selected = tab === active;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`tab-${tab}`}
                aria-selected={selected}
                aria-controls={`panel-${tab}`}
                onClick={() => setActive(tab)}
                className={`rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-brand-pinkStrong text-white"
                    : "bg-brand-grey text-brand-muted hover:bg-brand-tint hover:text-brand-pink"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${SOFTWARE}`}
        aria-labelledby={`tab-${SOFTWARE}`}
        hidden={active !== SOFTWARE}
      >
        {children}
      </div>

      {families.map(([name, items]) => (
        <div
          key={name}
          role="tabpanel"
          id={`panel-${name}`}
          aria-labelledby={`tab-${name}`}
          hidden={active !== name}
          className="mx-auto max-w-container px-6 py-14"
        >
          <h2 className="mb-2 text-2xl font-bold text-brand-dark sm:text-3xl">{name}</h2>
          <p className="mb-8 max-w-2xl leading-relaxed text-brand-muted">
            {t.installed}
          </p>

          <HardwareGrid items={items} locale={locale} />

          <div className="mt-10 rounded-card border border-slate-200 bg-white px-6 py-5">
            <HardwareFootnote locale={locale} />
            <a
              href={t.contactHref}
              className="mt-4 inline-block rounded-pill bg-brand-pinkStrong px-7 py-3 font-semibold text-white transition-colors hover:bg-brand-pinkInk"
            >
              {t.talk}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
