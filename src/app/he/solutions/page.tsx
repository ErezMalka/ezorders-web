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
    text: "אתר הזמנות מותאם למובייל שמאפשר ללקוחות לעיין בתפריט ולהזמין בכמה הקלקות — בלי אפליקציה ובלי חיכוך.",
  },
  {
    title: "תפריטים דיגיטליים",
    text: "תפריטים דיגיטליים שמתעדכנים בשניות, עם תמונות, תגיות ואלרגנים — מגדילים את הסל הממוצע ומפחיתים שאלות בשירות.",
  },
  {
    title: "עמדות קיוסק",
    text: "עמדות הזמנה עצמית שמקצרות תורים, מפנות את הצוות ומעלות את גובה ההזמנה הממוצעת.",
  },
  {
    title: "אפליקציית הזמנות למסעדה",
    text: "אפליקציה ממותגת ללקוחות החוזרים שלכם, עם הזמנות מהירות, נאמנות ועדכונים בזמן אמת.",
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
        s.title
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
  cards
  );

return createElement(PageLayout, { locale: "he" }, content);
}
