import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { MenuMockup } from "@/components/funnels/MenuMockup";

export const metadata: Metadata = {
  title: "שלחו תפריט → קבלו הדמיית קיוסק | EZOrders",
  description:
    "שלחו לנו תמונה של התפריט ונבנה לכם הדמיה חינם איך המסעדה שלכם נראית בעמדת קיוסק להזמנה עצמית. ללא התחייבות.",
  alternates: {
    canonical: "./", languages: { he: "/he/menu-mockup", "x-default": "/he/menu-mockup" } },
};

export default function MenuMockupPage() {
  return (
    <PageLayout locale="he">
      <section className="pb-20 pt-28">
        <div className="mx-auto grid max-w-container items-start gap-10 px-6 md:grid-cols-2">
          <div>
            <span className="text-sm font-bold uppercase tracking-wide text-brand-pinkInk">
              הדמיה חינם
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-brand-dark md:text-4xl">
              שלחו את התפריט שלכם — ותראו איך המסעדה נראית בקיוסק
            </h1>
            <p className="mt-4 text-lg text-brand-muted">
              במקום לדמיין — תראו. שלחו תמונה של התפריט, ונבנה לכם הדמיה אמיתית של
              המסעדה שלכם בעמדת קיוסק להזמנה עצמית, עם התפריט שלכם.
            </p>
            <ul className="mt-6 space-y-3 text-brand-dark">
              <li className="flex items-start gap-2">
                <span className="text-brand-pink">✓</span> פחות תורים, יותר הזמנות
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-pink">✓</span> Upsell אוטומטי בכל הזמנה
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-pink">✓</span> פחות תלות בכוח אדם
              </li>
            </ul>
          </div>
          <MenuMockup />
        </div>
      </section>
    </PageLayout>
  );
}
