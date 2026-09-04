import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { RelatedLinks } from "@/components/sections/RelatedLinks";
import { ConnectedRestaurant } from "@/components/sections/ConnectedRestaurant";
import { FaqSection } from "@/components/sections/FaqSection";
import { GENERAL_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

/**
 * The integrations page the site never had.
 *
 * Wolt, Tenbis, Cibus, Zap Rest, Mishloha and HAAT are the clearest thing
 * separating this from a generic restaurant POS — they are specific to this
 * market and a foreign vendor does not have them. Until now they were named in
 * exactly two places: one line of the FAQ, and /connected, a component preview
 * carrying noindex, no header and no footer, linked from nowhere. The strongest
 * differentiator on the site was the least visible thing on it.
 *
 * Every claim here traces to the answer already published in src/data/faq.ts —
 * orders from every channel land on the same screen and in the same reports,
 * with no re-keying. No API behaviour, sync interval or feature is asserted
 * beyond that, because nothing else has been verified.
 */

export const metadata: Metadata = {
  title: "חיבור קופה לוולט, תן ביס וסיבוס | EZOrders",
  description:
    "המערכת מתחברת לוולט, תן ביס, סיבוס, זאפ רסט, משלוחה ו-HAAT. כל ההזמנות נוחתות על אותו מסך ובאותם דוחות — בלי להקליד הזמנה פעמיים.",
  alternates: {
    canonical: "./",
    // Hebrew only: these platforms are Israeli and there is no English page to
    // point at. Claiming one would send an English visitor to a 404.
    languages: { he: "/he/integrations", "x-default": "/he/integrations" },
  },
};

const sectionStyle = { padding: "8rem 1.5rem 2rem", maxWidth: "56rem", margin: "0 auto" } as const;
const lowerStyle = { padding: "1rem 1.5rem 4rem", maxWidth: "56rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#D22F63", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "1rem" } as const;
const h2Style = { fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.5rem", marginTop: "2.5rem" } as const;
const introStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.75rem" } as const;
const h3Style = { fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" } as const;
const bodyStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } as const;
const ctaWrapStyle = { marginTop: "3rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" } as const;
const ctaStyle = { display: "inline-block", background: "#D22F63", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;

export default function HeIntegrationsPage() {
  const intro = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "אינטגרציות"),
    createElement("h1", { style: h1Style }, "כל הערוצים שלכם נוחתים במקום אחד"),
    createElement(
      "p",
      { style: leadStyle },
      "מסעדה ישראלית מקבלת היום הזמנות מוולט, מתן ביס, מסיבוס, מהאתר שלה ומהדלפק — ובלי חיבור אמיתי כל ערוץ מגיע במסך נפרד, נרשם בנפרד ומסתכם בנפרד. המערכת של EZOrders מחברת את כולם לאותה קופה, לאותו מסך מטבח ולאותו דוח סוף יום.",
    ),
  );

  const detail = createElement(
    "section",
    { style: lowerStyle },

    createElement("h2", { style: h2Style }, "לאילו פלטפורמות המערכת מתחברת"),
    createElement(
      "p",
      { style: introStyle },
      "המערכת מתחברת לוולט, תן ביס, סיבוס, זאפ רסט, משלוחה ו-HAAT, ולפלטפורמות נוספות. החיבור נעשה כחלק מההטמעה, ולא דורש מכם לתחזק שום דבר אחרי שהוא עובד.",
    ),

    createElement("h3", { style: h3Style }, "אפליקציות משלוחים"),
    createElement(
      "p",
      { style: bodyStyle },
      "וולט, תן ביס, משלוחה ו-HAAT. הזמנה שנפתחה באפליקציה מגיעה לקופה ולמסך המטבח כמו כל הזמנה אחרת. הצוות לא עובר בין טאבלטים ולא מקליד מחדש — וזו בדיוק הנקודה שבה נופלות הזמנות בשעת עומס.",
    ),

    createElement("h3", { style: h3Style }, "מועדוני עובדים ותשלום"),
    createElement(
      "p",
      { style: bodyStyle },
      "סיבוס ותן ביס בשימוש כאמצעי תשלום. החיוב נסגר מול הקופה, כך שההזמנה מסתכמת נכון בדוח ולא דורשת התאמה ידנית בסוף החודש מול דוח נפרד של הפלטפורמה.",
    ),

    createElement("h3", { style: h3Style }, "מערכות ניהול והזמנת מקומות"),
    createElement(
      "p",
      { style: bodyStyle },
      "זאפ רסט. השולחנות וההזמנות מדברים עם אותה מערכת שמנהלת את התפריט ואת הקופה, במקום לחיות בשני עולמות שצריך לסנכרן ביניהם בראש של מישהו.",
    ),

    createElement("h3", { style: h3Style }, "סליקת אשראי"),
    createElement(
      "p",
      { style: bodyStyle },
      "פתיחת מסוף שבא היא חלק מההטמעה ולא משהו שאתם צריכים לסדר לבד מול חברת הסליקה. זה גם אחד הדברים שקובעים את לוח הזמנים — ההטמעה המלאה לוקחת כארבעה עשר ימי עסקים, והמסוף הוא חלק מזה.",
    ),

    createElement("h2", { style: h2Style }, "מה זה אומר בפועל"),
    createElement(
      "p",
      { style: introStyle },
      "אינטגרציה היא לא רשימת לוגואים. היא נמדדת בשלושה דברים שקורים כל יום במסעדה.",
    ),

    createElement("h3", { style: h3Style }, "הזמנה אחת, מסך אחד"),
    createElement(
      "p",
      { style: bodyStyle },
      "הזמנה מוולט והזמנה מהדלפק מופיעות באותו מסך מטבח, באותה תור הכנה. אין טאבלט נפרד לכל פלטפורמה על השיש, ואין מצב שהזמנה יושבת עשר דקות על מכשיר שאף אחד לא הסתכל עליו.",
    ),

    createElement("h3", { style: h3Style }, "דוח אחד בסוף היום"),
    createElement(
      "p",
      { style: bodyStyle },
      "הפדיון מכל הערוצים מסתכם יחד. אתם רואים כמה הכניסה כל פלטפורמה בלי לאסוף שלושה דוחות מאתרים שונים ולהתאים ביניהם באקסל.",
    ),

    createElement("h3", { style: h3Style }, "תפריט אחד לעדכן"),
    createElement(
      "p",
      { style: bodyStyle },
      "פריט שאזל מסומן פעם אחת. הוא נעלם מהקיוסק, מהאתר ומהתפריט בשולחן — ולא נמכר בערוץ שששכחתם לעדכן בו.",
    ),

    createElement(
      "div",
      { style: ctaWrapStyle },
      createElement("a", { href: "/he/contact", style: ctaStyle }, "בדקו איתנו אם הפלטפורמה שלכם נתמכת"),
      createElement(WhatsAppButton, { locale: "he" }),
    ),
  );

  return createElement(
    PageLayout,
    { locale: "he" },
    createElement("script", {
      type: "application/ld+json",
      dangerouslySetInnerHTML: {
        __html: JSON.stringify(breadcrumbSchema("he", { name: "אינטגרציות", path: "/integrations" })),
      },
    }),
    intro,
    // The diagram was built for /connected, a noindexed preview nothing links
    // to. It is the clearest explanation of the product on the site, and this
    // is the page it was always describing.
    createElement(ConnectedRestaurant, null),
    detail,
    createElement(RelatedLinks, {
      locale: "he",
      items: [
        {
          href: "/he/pos",
          title: "מערכת קופה למסעדות",
          body: "הקופה שכל הערוצים האלה מתחברים אליה — מגירה, משמרות, דוחות X ו-Z ופיצול חשבונות.",
        },
        {
          href: "/he/kitchen-display",
          title: "מסך מטבח דיגיטלי",
          body: "המסך שעליו נוחתות ההזמנות מכל הפלטפורמות יחד, עם טיימרים וסטטוסים במקום בונים מודפסים.",
        },
        {
          href: "/he/restaurant-ordering-website",
          title: "אתר הזמנות משלכם",
          body: "הערוץ היחיד שבו אתם לא משלמים עמלה לאף אחד. מתחבר לאותה קופה בדיוק.",
        },
      ],
    }),
    createElement(FaqSection, { items: GENERAL_FAQ.he, locale: "he" }),
  );
}
