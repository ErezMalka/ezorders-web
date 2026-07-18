import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "פתרונות - ezorders",
  description:
    "הפתרונות של EZOrders למסעדות: אתר הזמנות למסעדה, תפריטים דיגיטליים, עמדות קיוסק ואפליקציית הזמנות — הכל מסונכרן ומתעדכן בזמן אמת.",
  alternates: {
    languages: {
      en: "/solutions",
      he: "/he/solutions",
      "x-default": "/solutions",
    },
  },
};

const solutions = [
  {
    title: "אתר הזמנות למסעדה",
    href: "/he/restaurant-ordering-website",
    text: "אתר הזמנות מותאם למובייל שמאפשר ללקוחות לעיין בתפריט ולהזמין בכמה הקלקות — בלי אפליקציה ובלי חיכוך.",
  },
  {
    title: "תפריטים דיגיטליים",
    href: "/he/digital-menus",
    text: "תפריטים דיגיטליים שמתעדכנים בשניות, עם תמונות, תגיות ואלרגנים — מגדילים את הסל הממוצע ומפחיתים שאלות בשירות.",
  },
  {
    title: "עמדות קיוסק",
    href: "/he/kiosk-stands",
    text: "עמדות הזמנה עצמית שמקצרות תורים, מפנות את הצוות ומעלות את גובה ההזמנה הממוצעת.",
  },
  {
    title: "אפליקציית הזמנות למסעדה",
    href: "/he/restaurant-ordering-app",
    text: "אפליקציה ממותגת ללקוחות החוזרים שלכם, עם הזמנות מהירות, נאמנות ועדכונים בזמן אמת.",
  },
  {
    title: "מערכת קופה למסעדות (POS)",
    href: "/he/pos",
    text: "קופה חכמה שמרכזת את כל ערוצי המכירה, סולקת בכל אמצעי תשלום ומפיקה דוחות בזמן אמת — השליטה המלאה על העסק ממסך אחד.",
  },
  {
    title: "הזמנה בסריקת QR מהשולחן",
    href: "/he/qr-ordering",
    text: "הסועדים סורקים קוד על השולחן, מזמינים ומשלמים מהטלפון — בלי אפליקציה ובלי המתנה. הסל הממוצע עולה והצוות מתפנה לאירוח.",
  },
  {
    title: "מסך מטבח דיגיטלי (KDS)",
    href: "/he/kitchen-display",
    text: "כל ההזמנות מכל הערוצים על מסך אחד במטבח, עם טיימרים, סטטוסים ולוח מוכנות ללקוחות — נגמר עידן הבונים המודפסים.",
  },
  ];

export default function HeSolutionsPage() {
  const cards = solutions.map((s) =>
    createElement(
      "div",
      {
        key: s.title,
        style: {
          border: "1px solid #eee",
          borderRadius: "1rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        },
      },
      createElement(
        "h2",
        { style: { fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" } },
        createElement("a", { href: s.href, style: { color: "inherit", textDecoration: "none" } }, s.title)
        ),
      createElement(
        "p",
        { style: { color: "#555", lineHeight: 1.8 } },
        s.text
        )
      )
                              );

const content = createElement(
  "section",
  {
    style: {
      padding: "8rem 1.5rem 4rem",
      maxWidth: "48rem",
      margin: "0 auto",
    },
  },
  createElement(
    "h1",
    { style: { fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" } },
    "הפתרונות שלנו"
    ),
  createElement(
    "p",
    { style: { color: "#555", lineHeight: 1.8, marginBottom: "2.5rem" } },
    "EZOrders מציעה חבילה שלמה של כלים דיגיטליים למסעדות — כולם מסונכרנים ומתעדכנים בזמן אמת, כדי לתת לכם שליטה מלאה על התפריט, המחירים והחוויה."
    ),
  createElement("img", {
    src: "/images/ai/ezorders-hero-restaurant-scene.png",
    alt: "מסעדה דיגיטלית עם מערכת EZOrders — עמדת קיוסק, קופה, מסכי תפריט ולקוחות מזמינים מהטלפון",
    style: { width: "100%", height: "auto", borderRadius: "1rem", marginBottom: "2.5rem" },
    loading: "lazy",
  }
    ),
  cards
  );

return createElement(PageLayout, { locale: "he" }, content);
}
