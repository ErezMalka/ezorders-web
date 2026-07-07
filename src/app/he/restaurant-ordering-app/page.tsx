import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "אפליקציית הזמנות למסעדה - ezorders",
  description: "אפליקציית הזמנות למסעדה שמנהלת הזמנות אונליין, מגבירה נאמנות לקוחות ומגדילה מכירות — עם התראות פוש, מעקב הזמנות ותשלום מאובטח.",
  alternates: { languages: { en: "/restaurant-ordering-app", he: "/he/restaurant-ordering-app", "x-default": "/restaurant-ordering-app" } },
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

export default function HeOrderingAppPage() {
  const content = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "שירות אפליקציות"),
    createElement("h1", { style: h1Style }, "הכניסו את המסעדה שלכם לעולם המובייל"),
    createElement("p", { style: leadStyle }, "אפליקציית הזמנות ידידותית שמאפשרת לכם לנהל הזמנות אונליין ללא מאמץ, לייעל את התפעול ולהגביר את שביעות רצון הלקוחות. התאימו את התפריט, עקבו אחר הזמנות ומלאי, וקבלו תובנות עסקיות חשובות — הכל ממקום אחד."),
    createElement("h2", { style: h2Style }, "יכולות האפליקציה"),
    createElement("p", { style: introStyle }, "פתרון הכל-באחד שמעמיק את הקשר עם הלקוחות ומחזיר אותם שוב ושוב."),
    createElement("h3", { style: h3Style }, "התראות פוש"),
    createElement("p", { style: bodyStyle }, "שמרו על הלקוחות מעודכנים והגדילו מכירות באמצעות הודעות ממוקדות ישירות לטלפון. כלי שיווק חזק שמשלב מבצעים ועדכונים ברגע הנכון — בלי מאמץ."),
    createElement("h3", { style: h3Style }, "מעקב הזמנות בזמן אמת"),
    createElement("p", { style: bodyStyle }, "הלקוחות עוקבים אחר ההזמנה שלהם בכל שלב, מההכנה ועד המסירה. שקיפות שמפחיתה פניות שירות ומעלה את רמת האמון והשביעות."),
    createElement("h3", { style: h3Style }, "מועדון נאמנות ותשלום מאובטח"),
    createElement("p", { style: bodyStyle }, "היסטוריית הזמנות, הזמנה חוזרת בלחיצה, קופוני גירוד ומבצעי הצטרפות — לצד תשלום דיגיטלי מאובטח ונוח שהופך כל הזמנה לחלקה."),
    createElement("h2", { style: h2Style }, "איך זה תורם לעסק שלכם?"),
    createElement("p", { style: introStyle }, "שיווק בעלות נמוכה, רווחיות משופרת וסל ממוצע גבוה יותר — הכל בפתרון אחד."),
    createElement("h3", { style: h3Style }, "שיווק בעלות נמוכה"),
    createElement("p", { style: bodyStyle }, "הגיעו לקהל רחב וקדמו את המסעדה שלכם בצורה אפקטיבית — ישירות דרך האפליקציה, בלי תקציבי מדיה גדולים."),
    createElement("h3", { style: h3Style }, "רווחיות משופרת"),
    createElement("p", { style: bodyStyle }, "ייעול התפעול, הפחתת עלויות ואופטימיזציה של יעילות — כדי למקסם את השורה התחתונה של המסעדה שלכם."),
    createElement("h3", { style: h3Style }, "סל ממוצע גבוה יותר"),
    createElement("p", { style: bodyStyle }, "מנגנוני אפסייל וקרוס-סייל מעודדים את הלקוחות לגלות פריטים נוספים בתפריט ולהגדיל את היקף ההזמנה בכל רכישה."),
    createElement("div", { style: ctaWrapStyle }, createElement("a", { href: "/he/contact", style: ctaStyle }, "דברו איתנו ותתחילו היום"))
    );

return createElement(PageLayout, { locale: "he" }, content);
}
