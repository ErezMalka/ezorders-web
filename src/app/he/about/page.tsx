import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "אודות - ezorders",
  description:
    "הכירו את EZOrders — אנחנו בונים תפריטים דיגיטליים ומערכת הזמנות למסעדות, שמתעדכנים בשניות ומלווים את הלקוח בצורה חלקה מהעיון ועד ההזמנה.",
  alternates: {
    languages: {
      en: "/about",
      he: "/he/about",
      "x-default": "/about",
    },
  },
};

export default function HeAboutPage() {
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
      "אודות EZOrders"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "2rem" } },
      "EZOrders הופכת כל צפייה בתפריט לרגע של החלטה. אנחנו בונים תפריטים דיגיטליים מבוססי מובייל למסעדות, שמתעדכנים בשניות, נראים מצוין בכל מכשיר, ומלווים את הלקוחות בצורה חלקה מהעיון ועד ההזמנה — מגדילים את הסל הממוצע ומפחיתים עומס בשירות."
      ),
    createElement(
      "h2",
      { style: { fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.75rem" } },
      "המשימה שלנו"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "2rem" } },
      "לתת לבעלי מסעדות שליטה מלאה — גם בשיא העומס. EZOrders מציבה מחירים, זמינות ומבצעים במרחק הקלקה אחת, בטלפון, בטאבלט או בעמדת קיוסק, כך שתוכלו להגיב לביקוש בלי הדפסות מחדש ובלי המתנה לעיצוב."
      ),
    createElement(
      "h2",
      { style: { fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.75rem" } },
      "החזון שלנו"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8 } },
      "תפריטים הופכים לחוויות דינמיות ומבוססות נתונים שמתאימות את עצמן לרגע — לשעה ביום, למלאי ולביקוש. אנחנו בונים לעבר המלצות חכמות יותר, כרטיסי פריט עשירים ואנליטיקה שמדגישה את מה שחשוב, בלי מורכבות."
      )
    );

return createElement(PageLayout, { locale: "he" }, content);
}
