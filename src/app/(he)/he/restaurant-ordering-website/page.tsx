import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { FaqSection } from "@/components/sections/FaqSection";
import { GENERAL_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "אתר הזמנות למסעדה — משלוחים ואיסוף עצמי אונליין | EZOrders",
  description: "אתר הזמנות אונליין למסעדה שלכם — חוויית הזמנה חלקה, תשלום מאובטח, אפסייל חכם ומערכת ניהול לקוחות שמגדילה מכירות.",
  alternates: {
    canonical: "./", languages: { en: "/en/restaurant-ordering-website", he: "/he/restaurant-ordering-website", "x-default": "/he/restaurant-ordering-website" } },
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

export default function HeOrderingWebsitePage() {
  const content = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "שירות אתר הזמנות"),
    createElement("h1", { style: h1Style }, "אתר הזמנות למסעדה שעובד בשבילכם"),
    createElement("p", { style: leadStyle }, "אתר הזמנות אונליין ממותג משלכם, שמלווה את הלקוח מהעיון בתפריט ועד לתשלום המאובטח — בלי עמלות של פלטפורמות חיצוניות. הלקוחות מזמינים בקצב שלהם, בונים את ההזמנה בדיוק כרצונם, ואתם מקבלים כל הזמנה ישירות למטבח, מסודרת וברורה."),
    createElement("img", { src: "/images/ai/ezorders-online-ordering-laptop.webp", alt: "אתר הזמנות למסעדה של EZOrders על מסך לפטופ — תפריט עם סל קניות ותשלום", style: imgStyle, loading: "lazy" }),
    createElement("h2", { style: h2Style }, "יכולות מרכזיות"),
    createElement("p", { style: introStyle }, "כל מה שמסעדה מודרנית צריכה כדי למכור יותר ולעבוד חכם — במקום אחד."),
    createElement("h3", { style: h3Style }, "מערכת אפסייל חכמה"),
    createElement("p", { style: bodyStyle }, "המערכת מזהה הזדמנויות למכירה נוספת ומציעה ללקוח שדרוגים, קומבינציות ומבצעים ברגע הנכון — כך שהסל הממוצע גדל באופן טבעי, בלי לחץ ובלי מכירה אגרסיבית."),
    createElement("h3", { style: h3Style }, "ניהול משלוחים מתקדם"),
    createElement("p", { style: bodyStyle }, "הגדרת אזורי חלוקה, דמי משלוח וזמני הגעה משוערים, עם מעקב בזמן אמת אחר כל הזמנה. הלקוח יודע בדיוק מתי המנה תגיע, והצוות שלכם שולט בכל שלב."),
    createElement("h3", { style: h3Style }, "מסד נתוני לקוחות והיסטוריית הזמנות"),
    createElement("p", { style: bodyStyle }, "כל הזמנה בונה תמונה מלאה על הלקוחות שלכם. השתמשו בהיסטוריית ההזמנות כדי להתאים מבצעים אישיים, להגביר נאמנות ולהחזיר לקוחות שוב ושוב."),
    createElement("h2", { style: h2Style }, "איך זה תורם לעסק שלכם?"),
    createElement("p", { style: introStyle }, "אתר הזמנות טוב לא רק מוכר — הוא מייעל את כל התפעול שלכם."),
    createElement("h3", { style: h3Style }, "פחות טעויות"),
    createElement("p", { style: bodyStyle }, "הלקוח מזמין בעצמו ומקבל סיכום הזמנה מפורט לפני התשלום. אין יותר אי-הבנות בטלפון ואין הזמנות שגויות שמבזבזות זמן וכסף."),
    createElement("h3", { style: h3Style }, "חוויית לקוח משופרת"),
    createElement("p", { style: bodyStyle }, "הזמנה מהירה, נוחה וללא מגע, שזמינה מכל מכשיר בכל שעה. הלקוחות נהנים מתהליך פשוט וברור — וחוזרים."),
    createElement("h3", { style: h3Style }, "יותר מכירות"),
    createElement("p", { style: bodyStyle }, "תמונות מנות מושכות, המלצות חכמות ותהליך הזמנה חלק — כולם עובדים יחד כדי להגדיל את היקף ההזמנות ואת ההכנסה שלכם."),
    createElement("div", { style: ctaWrapStyle }, createElement("a", { href: "/he/contact", style: ctaStyle }, "דברו איתנו ותתחילו היום"))
    );

return createElement(
  PageLayout,
  { locale: "he" },
  createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(breadcrumbSchema("he", { name: "אתר הזמנות למסעדה", path: "/restaurant-ordering-website" })) },
  }),
  content,
  createElement(FaqSection, { items: GENERAL_FAQ.he, locale: "he" }),
  );
}
