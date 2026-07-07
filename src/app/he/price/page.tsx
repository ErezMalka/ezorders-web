import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "מחירים - ezorders",
  description:
    "תמחור פשוט ושקוף ל-EZOrders. בחרו את החבילה שמתאימה למסעדה שלכם והתחילו בהתנסות חינם ל-14 יום, ללא כרטיס אשראי.",
  alternates: {
    languages: {
      en: "/price",
      he: "/he/price",
      "x-default": "/price",
    },
  },
};

export default function HePricePage() {
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
      "מחירים"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "1rem" } },
      "אנחנו מאמינים בתמחור פשוט ושקוף. בלי הפתעות, בלי עלויות נסתרות — רק כלים שעוזרים למסעדה שלכם למכור יותר ולעבוד חכם יותר."
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "1rem" } },
      "כל החבילות כוללות תפריטים דיגיטליים, עדכונים בזמן אמת ותמיכה. אפשר להתחיל בהתנסות חינם ל-14 יום, ללא צורך בכרטיס אשראי."
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8 } },
      "רוצים הצעת מחיר מותאמת למסעדה שלכם? צרו איתנו קשר ונתאים לכם חבילה."
      )
    );

return createElement(PageLayout, { locale: "he" }, content);
}
