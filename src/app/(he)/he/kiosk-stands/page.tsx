import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { RelatedLinks } from "@/components/sections/RelatedLinks";
import { HardwareShowcase } from "@/components/sections/HardwareShowcase";
import { loadHardwareShowcase } from "@/lib/agent/products";
import { FaqSection } from "@/components/sections/FaqSection";
import { GENERAL_FAQ, KIOSK_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "עמדות קיוסק למסעדות — הזמנה עצמית שמקצרת תורים | EZOrders",
  description: "עמדת קיוסק למסעדה בשירות עצמי: איך זה עובד, כמה עמדות צריך, מה לבדוק לפני שבוחרים ואיך נראית הטמעה שלא משבשת את השירות.",
  alternates: {
    canonical: "./", languages: { en: "/en/kiosk-stands", he: "/he/kiosk-stands", "x-default": "/he/kiosk-stands" } },
};

const sectionStyle = { padding: "8rem 1.5rem 4rem", maxWidth: "56rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#D22F63", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "3rem" } as const;
const h2Style = { fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.5rem" } as const;
const introStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.75rem" } as const;
const h3Style = { fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" } as const;
const bodyStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } as const;
const ctaWrapStyle = { marginTop: "3rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" } as const;
const ctaStyle = { display: "inline-block", background: "#D22F63", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;
const imgStyle = { width: "100%", height: "auto", borderRadius: "1rem", marginBottom: "2.5rem" } as const;
const linkStyle = { color: "#D22F63", textDecoration: "underline" } as const;
const olStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem", paddingInlineStart: "1.25rem" } as const;

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
    createElement("h1", { style: h1Style }, "עמדות קיוסק להזמנה עצמית למסעדות"),
    createElement("p", { style: leadStyle }, "עמדת קיוסק היא מסך שהסועד מזמין ומשלם בו בעצמו, במקום לחכות בתור לדלפק. העמוד הזה מסביר מה העמדה עושה, כמה עמדות מסעדה באמת צריכה, מה כדאי לבדוק מול כל ספק לפני שבוחרים, ואיך נראית הטמעה שלא משבשת את השירות באמצע."),
    createElement("img", { src: "/images/ai/ezorders-self-service-kiosk.webp", width: 928, height: 1152, alt: "עמדת קיוסק להזמנה עצמית של EZOrders — לקוחה מזמינה במסך מגע ממותג במסעדה", style: imgStyle, loading: "lazy" }),
    createElement("h2", { style: h2Style }, "יכולות עמדת הקיוסק"),
    createElement("p", { style: introStyle }, "עמדת קיוסק טובה היא הרבה יותר ממסך מגע גדול — היא מלווה כל סועד מהמגע הראשון ועד הקבלה, בלי חיכוך."),
    createElement("h3", { style: h3Style }, "עיצוב מרשים וממותג"),
    createElement("p", { style: bodyStyle }, "מסכים גדולים בשילוב עיצוב נקי שמשדרג כל לובי, דלפק או אזור אוכל. התאימו צבעים, לוגו ותמונות תפריט למותג שלכם ליצירת רושם ראשוני חזק."),
    createElement("h3", { style: h3Style }, "הזמנה מהירה ומדויקת"),
    createElement("p", { style: bodyStyle }, "ממשק מותאם למגע עם כפתורים גדולים, היררכיית קטגוריות ברורה ותשלום מהיר שומרים על תנועה בתור. סימון בחירות חובה מול אופציונליות ואייקוני אלרגנים מפחיתים טעויות בהזמנה."),
    createElement("h3", { style: h3Style }, "הגדלת מכירות חכמה"),
    createElement("p", { style: bodyStyle }, "חבילות וקומבינציות מוכנות מראש מגדילות את הסל הממוצע באופן טבעי — בלי מכירה אגרסיבית, רק הצעה מועילה ברגע הנכון."),
    createElement("h2", { style: h2Style }, "איך בוחרים עמדת קיוסק"),
    createElement("p", { style: introStyle }, "רוב ההחלטות כאן נסגרות על המסך והמחיר, ואלה דווקא החלקים הקלים. ארבע השאלות הבאות הן אלה שמבדילות בין עמדה שמקצרת את התור לבין עמדה שמעבירה אותו למקום אחר."),
    createElement("h3", { style: h3Style }, "כמה עמדות, ולפי מה"),
    createElement("p", { style: bodyStyle }, "המספר נגזר מחצי השעה העמוסה ביותר ולא מגודל המסעדה: כמה סועדים מגיעים לדלפק באותו חלון זמן, וכמה זמן לוקחת הזמנה ממוצעת. עמדה אחת פחות מדי פירושה שהתור עבר מהדלפק למסכים."),
    createElement("h3", { style: h3Style }, "לאן ההזמנה ממשיכה"),
    createElement("p", { style: bodyStyle }, "הקיוסק הוא תחילת השרשרת, לא סופה. בקשו לראות בהדגמה מה קורה להזמנה אחרי שהסועד מסיים — איפה היא מופיעה לצוות, ואיך היא מגיעה למטבח. זו הנקודה שבה קיוסק שנקנה בנפרד מהמערכת מתחיל לדרוש הקלדה חוזרת.", createElement("span", null, " אפשר לראות את שני הצדדים האלה ב"), createElement("a", { href: "/he/pos", style: linkStyle }, "קופה למסעדה"), createElement("span", null, " וב"), createElement("a", { href: "/he/kitchen-display", style: linkStyle }, "מסך המטבח"), createElement("span", null, ".")),
    createElement("h3", { style: h3Style }, "תשלומים — שאלו לפי ערוץ"),
    createElement("p", { style: bodyStyle }, "אמצעי התשלום מתומחרים כתוספות נפרדות מהעמדה עצמה, והתמחור הוא ברמת החשבון ולא לפי ערוץ. לכן העובדה שאמצעי תשלום מופיע בהצעת המחיר אינה אומרת לבדה שהוא פעיל דווקא במסך הקיוסק. בקשו טבלה פשוטה: עמודה לכל ערוץ, שורה לכל אמצעי תשלום.", createElement("span", null, " הרכיבים והמחירים מפורטים ב"), createElement("a", { href: "/he/price", style: linkStyle }, "עמוד התמחור"), createElement("span", null, ".")),
    createElement("h3", { style: h3Style }, "מה כבר מחובר אצלכם"),
    createElement("p", { style: bodyStyle }, "אם אתם כבר עובדים עם אפליקציות משלוחים או עם כרטיסי הסעדה, בדקו מראש איך הן יושבות לצד הקיוסק — כדי שסוף היום יישאר דוח אחד ולא שלושה.", createElement("span", null, " רשימת החיבורים נמצאת ב"), createElement("a", { href: "/he/integrations", style: linkStyle }, "עמוד האינטגרציות"), createElement("span", null, ".")),
    createElement("h2", { style: h2Style }, "איך נראית הטמעה"),
    createElement("p", { style: introStyle }, "בשלבים, ולא הכול ביום אחד. הסדר שלמטה הוא מה שמונע את התקלה הנפוצה — עמדה שנדלקת לפני שהצוות והתפריט מוכנים אליה."),
    createElement("ol", { style: olStyle }, createElement("li", null, "התפריט נבנה ונבדק על המסך, כולל תוספות, חובה־מול־רשות ותמונות."), createElement("li", null, "התשלום נבדק מקצה לקצה על כל אמצעי שאתם מתכוונים לקבל."), createElement("li", null, "הצוות עובר הדרכה קצרה — בעיקר למה לעשות כשסועד נתקע."), createElement("li", null, "העמדה נפתחת בשעה שקטה, לא בצהריים, וצופים בסועדים האמיתיים הראשונים."), createElement("li", null, "מתקנים את מה שהתגלה, ורק אז מכניסים אותה לשעת השיא.")),
    createElement("h2", { style: h2Style }, "איך זה תורם לעסק שלכם?"),
    createElement("p", { style: introStyle }, "קיוסק מצוין הוא לא רק חומרה — הוא דרך אמינה לשרת יותר סועדים, להעלות את הסל ולנהל משמרות רזות יותר בלי לפגוע באירוח."),
    createElement("h3", { style: h3Style }, "עלויות כוח אדם נמוכות יותר"),
    createElement("p", { style: bodyStyle }, "העברת ההזמנה השגרתית לעמדות הקיוסק מאפשרת לתכנן משמרות רזות יותר בחזית ולהעביר אנשי צוות להכנה ולשירות שבאמת דורשים מגע אנושי."),
    createElement("h3", { style: h3Style }, "פחות לחץ על הלקוח"),
    createElement("p", { style: bodyStyle }, "מסך גדול, שפה ידידותית ותמונות אוכל ברורות מאפשרים ללקוח להזמין בקצב שלו — בלי תחושת דחיפות מהתור שמאחוריו."),
    createElement("h3", { style: h3Style }, "נגישות רחבה יותר"),
    createElement("p", { style: bodyStyle }, "תהליך רב-לשוני מאפשר לכל סועד לבחור את שפתו ישירות בעמדה — כך שאף איש צוות לא צריך לדבר אותה, וההזמנה נעשית פשוטה לקהל רחב יותר."),
    createElement("div", { style: ctaWrapStyle }, createElement("a", { href: "/he/contact", style: ctaStyle }, "דברו איתנו ותתחילו היום"), createElement(WhatsAppButton, { locale: "he" }))
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
    createElement(RelatedLinks, {
      locale: "he",
      items: [
        {
          href: "/he/queue-calculator",
          title: "מחשבון: כמה עולה לכם התור?",
          body: "הזינו כמה סועדים עוברים אצלכם בשעת שיא וכמה זמן לוקחת הזמנה, וקבלו הערכה של מה שהתור עולה לכם בפועל — בהזמנות שלא נסגרו ובסועדים שוויתרו.",
        },
        {
          href: "/he/blog/self-order-kiosks-peak-hours",
          title: "מה קיוסקים באמת משנים בשעות העומס",
          body: "לא הבטחות שיווקיות אלא מה קורה למהירות השירות, לדיוק ההזמנות ולסל הממוצע דווקא ברגעים שבהם המסעדה הכי עמוסה.",
        },
        {
          href: "/he/blog/restaurant-self-order-kiosk-software",
          title: "תוכנת קיוסק להזמנה עצמית — מדריך למפעילים",
          body: "איך התוכנה עובדת, מה לדרוש ממנה, ואיך נראה תהליך הטמעה שלא משבש לכם את השירות באמצע.",
        },
      ],
    }),
    createElement(FaqSection, { items: [...KIOSK_FAQ.he, ...GENERAL_FAQ.he], locale: "he" })
  );
}
