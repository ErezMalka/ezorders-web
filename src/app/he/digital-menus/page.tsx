import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "תפריטים דיגיטליים - ezorders",
  description: "תפריט דיגיטלי למסעדה שמתעדכן בשניות, נראה מצוין בכל מכשיר ומגדיל את הסל הממוצע — עם QR לכל שולחן ותמיכה רב-לשונית.",
  alternates: { languages: { en: "/digital-menus", he: "/he/digital-menus", "x-default": "/digital-menus" } },
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

export default function HeDigitalMenusPage() {
  const content = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "שירות תפריטים דיגיטליים"),
    createElement("h1", { style: h1Style }, "תנו לתפריט שלכם להצטרף לעולם הדיגיטלי"),
    createElement("p", { style: leadStyle }, "החליפו את התפריט המודפס בתפריט דיגיטלי רספונסיבי שמתעדכן בשניות, נראה מצוין בכל טלפון, ומוביל את הסועד בביטחון מהעיון ועד ההזמנה בלחיצה אחת. פחות חיכוך, יותר החלטות — ויותר הזמנות."),
    createElement("img", { src: "/images/ai/ezorders-mobile-ordering-app.png", alt: "תפריט דיגיטלי למסעדה על מסך טלפון — אפליקציית EZOrders ליד מעמד QR על שולחן", style: imgStyle, loading: "lazy" }),
    createElement("h2", { style: h2Style }, "יכולות התפריט הדיגיטלי"),
    createElement("p", { style: introStyle }, "לעבור לדיגיטל ולהישאר גמישים — התפריט מתעדכן ברגע ומותאם לכל סועד."),
    createElement("h3", { style: h3Style }, "עדכון בזמן אמת"),
    createElement("p", { style: bodyStyle }, "שנו מחירים, סמנו פריט כאזל מהמלאי או תזמנו מנות עונתיות בשניות — בלי מעצב ובלי מפתח. ערכו פעם אחת, והשינוי מופיע בכל מקום מיד."),
    createElement("h3", { style: h3Style }, "תפריט רב-לשוני ונגיש"),
    createElement("p", { style: bodyStyle }, "תפריט בכמה שפות, סימון אלרגנים וניתוב QR לכל שולחן — כל הפרטים שחשובים לסועד המודרני, שבונים אמון ומקלים על ההזמנה מבלי להעמיס על הצוות."),
    createElement("h3", { style: h3Style }, "חוויית עיון מזמינה"),
    createElement("p", { style: bodyStyle }, "תמונות חדות, קטגוריות ברורות ופעולות מיידיות מעניקים לסועד חוויית גלישה נקייה שמעודדת אותו לבחור מהר ובביטחון."),
    createElement("h2", { style: h2Style }, "איך זה תורם לעסק שלכם?"),
    createElement("p", { style: introStyle }, "תפריט דיגיטלי מפחית חיכוך בכל שלב — הסועד מגלה, בוחר ומזמין מהר יותר."),
    createElement("h3", { style: h3Style }, "מהיר וקל לתפעול"),
    createElement("p", { style: bodyStyle }, "ממשק נקי שנבנה לבעלי עסקים עסוקים. כל שינוי מתבצע בלחיצה, ללא תלות באיש מקצוע חיצוני ובלי המתנה."),
    createElement("h3", { style: h3Style }, "סל ממוצע גבוה יותר"),
    createElement("p", { style: bodyStyle }, "המלצות חכמות והצגה ויזואלית מושכת מובילות את הסועד לגלות פריטים נוספים ולהגדיל את היקף ההזמנה — בצורה טבעית."),
    createElement("h3", { style: h3Style }, "פחות עומס בשירות"),
    createElement("p", { style: bodyStyle }, "כשהסועד מזמין בעצמו בצורה ברורה, הצוות מתפנה להתמקד באירוח ובשירות — במקום בקבלת הזמנות ותיקון טעויות."),
    createElement("div", { style: ctaWrapStyle }, createElement("a", { href: "/he/contact", style: ctaStyle }, "דברו איתנו ותתחילו היום"))
    );

return createElement(PageLayout, { locale: "he" }, content);
}
