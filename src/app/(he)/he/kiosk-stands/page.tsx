import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { HardwareShowcase } from "@/components/sections/HardwareShowcase";
import { loadHardwareShowcase } from "@/lib/agent/products";
import { FaqSection } from "@/components/sections/FaqSection";
import { GENERAL_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "עמדות קיוסק למסעדות — הזמנה עצמית שמקצרת תורים | EZOrders",
  description: "עמדת קיוסק למסעדה בשירות עצמי שהופכת עומסי שעות שיא להזמנות מהירות, מדויקות ובעלות סל גבוה — ומפנה זמן לצוות.",
  alternates: {
    canonical: "./", languages: { en: "/en/kiosk-stands", he: "/he/kiosk-stands", "x-default": "/he/kiosk-stands" } },
};

const sectionStyle = { padding: "8rem 1.5rem 4rem", maxWidth: "56rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#e5306f", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "3rem" } as const;
const h2Style = { fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.5rem" } as const;
const introStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.75rem" } as const;
const h3Style = { fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" } as const;
const bodyStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } as const;
const ctaWrapStyle = { marginTop: "3rem" } as const;
const ctaStyle = { display: "inline-block", background: "#e5306f", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;
const imgStyle = { width: "100%", height: "auto", borderRadius: "1rem", marginBottom: "2.5rem" } as const;

/**
 * Rebuilt at most once an hour.
 *
 * The prices come from the database now, and this is a marketing page that
 * should be served from cache. An hour suits hardware: a kiosk is repriced when
 * a supplier reprices it, a handful of times a year — not the one-minute cadence
 * /he/price uses for a list an admin edits while on the phone to a customer.
 */
export const revalidate = 3600;

export default async function HeKioskStandsPage() {
  const hardware = await loadHardwareShowcase();

  const content = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "שירות עמדות קיוסק"),
    createElement("h1", { style: h1Style }, "עידן התורים הארוכים נגמר"),
    createElement("p", { style: leadStyle }, "עמדת קיוסק מודרנית בשירות עצמי שהופכת את פקקי שעות השיא להזמנות מהירות, מדויקות ובעלות המרה גבוהה. הלקוחות נהנים מתהליך אינטואיטיבי, והצוות שלכם מקבל בחזרה זמן יקר להתמקד באירוח."),
    createElement("img", { src: "/images/ai/ezorders-self-service-kiosk.webp", alt: "עמדת קיוסק להזמנה עצמית של EZOrders — לקוחה מזמינה במסך מגע ממותג במסעדה", style: imgStyle, loading: "lazy" }),
    createElement("h2", { style: h2Style }, "יכולות עמדת הקיוסק"),
    createElement("p", { style: introStyle }, "עמדת קיוסק טובה היא הרבה יותר ממסך מגע גדול — היא מלווה כל סועד מהמגע הראשון ועד הקבלה, בלי חיכוך."),
    createElement("h3", { style: h3Style }, "עיצוב מרשים וממותג"),
    createElement("p", { style: bodyStyle }, "מסכים גדולים בשילוב עיצוב נקי שמשדרג כל לובי, דלפק או אזור אוכל. התאימו צבעים, לוגו ותמונות תפריט למותג שלכם ליצירת רושם ראשוני חזק."),
    createElement("h3", { style: h3Style }, "הזמנה מהירה ומדויקת"),
    createElement("p", { style: bodyStyle }, "ממשק מותאם למגע עם כפתורים גדולים, היררכיית קטגוריות ברורה ותשלום מהיר שומרים על תנועה בתור. סימון בחירות חובה מול אופציונליות ואייקוני אלרגנים מפחיתים טעויות בהזמנה."),
    createElement("h3", { style: h3Style }, "הגדלת מכירות חכמה"),
    createElement("p", { style: bodyStyle }, "חבילות וקומבינציות מוכנות מראש מגדילות את הסל הממוצע באופן טבעי — בלי מכירה אגרסיבית, רק הצעה מועילה ברגע הנכון."),
    createElement("h2", { style: h2Style }, "איך זה תורם לעסק שלכם?"),
    createElement("p", { style: introStyle }, "קיוסק מצוין הוא לא רק חומרה — הוא דרך אמינה לשרת יותר סועדים, להעלות את הסל ולנהל משמרות רזות יותר בלי לפגוע באירוח."),
    createElement("h3", { style: h3Style }, "עלויות כוח אדם נמוכות יותר"),
    createElement("p", { style: bodyStyle }, "העברת ההזמנה השגרתית לעמדות הקיוסק מאפשרת לתכנן משמרות רזות יותר בחזית ולהעביר אנשי צוות להכנה ולשירות שבאמת דורשים מגע אנושי."),
    createElement("h3", { style: h3Style }, "פחות לחץ על הלקוח"),
    createElement("p", { style: bodyStyle }, "מסך גדול, שפה ידידותית ותמונות אוכל ברורות מאפשרים ללקוח להזמין בקצב שלו — בלי תחושת דחיפות מהתור שמאחוריו."),
    createElement("h3", { style: h3Style }, "נגישות רחבה יותר"),
    createElement("p", { style: bodyStyle }, "תהליך רב-לשוני מאפשר לכל סועד לבחור את שפתו ישירות בעמדה — כך שאף איש צוות לא צריך לדבר אותה, וההזמנה נעשית פשוטה לקהל רחב יותר."),
    createElement("div", { style: ctaWrapStyle }, createElement("a", { href: "/he/contact", style: ctaStyle }, "דברו איתנו ותתחילו היום"))
    );

return createElement(
    PageLayout,
    { locale: "he" },
    createElement("script", {
      type: "application/ld+json",
      dangerouslySetInnerHTML: {
        __html: JSON.stringify(
          breadcrumbSchema("he", { name: "עמדות קיוסק", path: "/kiosk-stands" }),
        ),
      },
    }),
    content,
    createElement(HardwareShowcase, { items: hardware }),
    createElement(FaqSection, { items: GENERAL_FAQ.he, locale: "he" })
  );
}
