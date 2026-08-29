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

      {/* The page was 116 words — the thinnest in the sitemap. A visitor asked
          to upload their menu wants to know what they get back and what
          happens to the file before they do it, and none of that was on the
          page. It also had nothing for a search engine to rank. */}
      <section className="pb-20" aria-labelledby="mockup-how">
        <div className="mx-auto max-w-2xl px-6">
          <h2 id="mockup-how" className="text-2xl font-bold text-brand-dark">
            מה בדיוק תקבלו
          </h2>
          <p className="mt-4 leading-8 text-brand-muted">
            אנחנו לוקחים את התפריט שאתם שולחים — צילום, PDF או קישור, מה שיש לכם —
            ובונים ממנו מסך קיוסק אמיתי: הקטגוריות שלכם, השמות שלכם, המחירים שלכם.
            לא תבנית עם תמונות מלאי, אלא איך המסעדה שלכם נראית בעמדה.
          </p>
          <p className="mt-4 leading-8 text-brand-muted">
            הסיבה שזה שווה את הטרחה היא שרוב ההחלטות על קיוסק נתקעות באותה נקודה:
            קשה לדמיין איך תפריט של ארבעים פריטים עם תוספות מתנהג על מסך מגע.
            תפריט צפוף מדי דורש גלילה, קטגוריות לא ברורות מאטות את התור, ומנות עם
            הרבה בחירות חובה נראות אחרת לגמרי כשמפרקים אותן לשלבים. את זה רואים
            בהדמיה, לא בשיחה.
          </p>

          <h2 className="mt-10 text-2xl font-bold text-brand-dark">כמה זמן זה לוקח</h2>
          <p className="mt-4 leading-8 text-brand-muted">
            בדרך כלל יום עסקים אחד עד שניים, תלוי בגודל התפריט. נחזור אליכם עם
            ההדמיה ועם ההערות שעלו תוך כדי — למשל אם יש קטגוריה שכדאי לפצל או
            פריט שמוגדר בצורה שתקשה על הסועד לבחור.
          </p>

          <h2 className="mt-10 text-2xl font-bold text-brand-dark">
            מה קורה לתפריט ששלחתם
          </h2>
          <p className="mt-4 leading-8 text-brand-muted">
            הוא משמש לבניית ההדמיה ולשום דבר אחר. אין כאן התחייבות, אין תהליך
            מכירה שנפתח אוטומטית, ואם תחליטו שלא — תגידו ונמחק אותו.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
