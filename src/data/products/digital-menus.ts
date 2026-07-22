import type { ProductContent } from "@/components/ProductPageLayout";
import type { Locale } from "@/data/homeContent";

const en: ProductContent = {
  tag: "Digital Menus Service",
  titleParts: ["Let your menu join ", "the digital world", ""],
  heroBody:
    "Modernize your menu experience. Swap paper for a responsive digital menu for restaurants with real-time edits, built-in upsells, and one-tap order links.",
  heroImage: "/images/digital-menus-hero.webp",
  featuresHeading: "Digital Menu Features",
  featuresIntro:
    "Go digital, stay agile. Your restaurant digital menu updates in moments, looks great on any phone, and helps more diners choose faster.",
  features: [
    { title: "Real-time updates", icon: "menu", body: "Change prices, mark items sold out, or schedule seasonal dishes in seconds — no designer, no developer. Edit once and it appears everywhere instantly." },
    { title: "Multi-language & accessible", icon: "web", body: "Menus in several languages, allergen labels and per-table QR routing — every detail a modern diner needs to order with confidence." },
    { title: "Inviting browsing experience", icon: "products", body: "Crisp photos, clear categories and instant actions give guests a clean, friction-free experience that helps them choose fast." },
    { title: "Unique design", icon: "settings", body: "A branded, on-theme menu that matches your restaurant — colours, logo and imagery all your own." },
    { title: "Application control", icon: "dashboard", body: "Manage everything from one simple dashboard built for busy operators." },
    { title: "Analytics", icon: "analytics", body: "See what sells, what stalls and where to focus, straight from the menu." },
  ],
  benefitsHeading: "How it benefits your business",
  benefitsIntro:
    "A digital menu for restaurants reduces friction at every step: guests explore visually, choose confidently, and order faster.",
  benefits: [
    { title: "Unique Features", body: "From multi-language menus to allergen disclosures and per-table QR routing, ezorders packs the details that matter to modern diners. Build trust with clarity while keeping your team focused on hospitality." },
    { title: "Fast and easy to use", body: "Edit once, update everywhere. Change prices, mark items sold out, or schedule seasonal dishes in seconds. No designer, no developer- just a clean interface built for busy operators." },
    { title: "User Friendly", body: "Guests get a friction-free browsing experience: crisp photos, clear categories, and immediate actions." },
  ],
  faq: [
    { q: "How does the ordering system work?", a: "The ordering system works by allowing customers to browse the restaurant’s menu, select their desired items, customize their orders if needed, and make payments securely online. It simplifies the ordering process, ensures accuracy, and provides a convenient and contactless experience for customers." },
    { q: "What is the ordering system?" },
    { q: "What is ordering management?" },
    { q: "What is digital ordering?" },
    { q: "Why is the ordering system important?" },
  ],
};

const he: ProductContent = {
  tag: "שירות תפריטים דיגיטליים",
  titleParts: ["תנו לתפריט שלכם להצטרף ל", "עולם הדיגיטלי", ""],
  heroBody:
    "החליפו את התפריט המודפס בתפריט דיגיטלי רספונסיבי שמתעדכן בשניות, נראה מצוין בכל טלפון, ומוביל את הסועד בביטחון מהעיון ועד ההזמנה בלחיצה אחת. פחות חיכוך, יותר החלטות — ויותר הזמנות.",
  heroImage: "/images/digital-menus-hero.webp",
  featuresHeading: "יכולות התפריט הדיגיטלי",
  featuresIntro:
    "לעבור לדיגיטל ולהישאר גמישים — התפריט מתעדכן ברגע ומותאם לכל סועד.",
  features: [
    { title: "עדכון בזמן אמת", icon: "menu", body: "שנו מחירים, סמנו פריט כאזל מהמלאי או תזמנו מנות עונתיות בשניות — בלי מעצב ובלי מפתח. ערכו פעם אחת, והשינוי מופיע בכל מקום מיד." },
    { title: "תפריט רב-לשוני ונגיש", icon: "web", body: "תפריט בכמה שפות, סימון אלרגנים וניתוב QR לכל שולחן — כל הפרטים שחשובים לסועד המודרני, שבונים אמון ומקלים על ההזמנה מבלי להעמיס על הצוות." },
    { title: "חוויית עיון מזמינה", icon: "products", body: "תמונות חדות, קטגוריות ברורות ופעולות מיידיות מעניקים לסועד חוויית גלישה נקייה שמעודדת אותו לבחור מהר ובביטחון." },
  ],
  benefitsHeading: "איך זה תורם לעסק שלכם?",
  benefitsIntro:
    "תפריט דיגיטלי מפחית חיכוך בכל שלב — הסועד מגלה, בוחר ומזמין מהר יותר.",
  benefits: [
    { title: "מהיר וקל לתפעול", body: "ממשק נקי שנבנה לבעלי עסקים עסוקים. כל שינוי מתבצע בלחיצה, ללא תלות באיש מקצוע חיצוני ובלי המתנה." },
    { title: "סל ממוצע גבוה יותר", body: "המלצות חכמות והצגה ויזואלית מושכת מובילות את הסועד לגלות פריטים נוספים ולהגדיל את היקף ההזמנה — בצורה טבעית." },
    { title: "פחות עומס בשירות", body: "כשהסועד מזמין בעצמו בצורה ברורה, הצוות מתפנה להתמקד באירוח ובשירות — במקום בקבלת הזמנות ותיקון טעויות." },
  ],
  faq: [],
};

export const digitalMenusContent = { en, he } as const;

export function getDigitalMenusContent(locale: Locale = "en") {
  return locale === "he" ? he : en;
}
