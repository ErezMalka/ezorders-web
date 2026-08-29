import type { IconName } from "@/components/Icons";
import type { Locale } from "@/data/homeContent";

export type PosChip = { name: string; icon: IconName };
export type PosFeature = { title: string; body: string };

export type PosContent = {
  meta: { title: string; description: string };

  heroTag: string;
  heroTitleParts: [string, string, string];
  heroLead: string;
  sessionLabel: string;

  modules: PosChip[];

  featuresTitle: string;
  featuresLead: string;
  features: PosFeature[];

  benefitsTitle: string;
  benefitsLead: string;
  benefits: PosFeature[];
};

const en: PosContent = {
  meta: {
    title: "Restaurant POS — Orders, Payments & Reports | EZOrders",
    description:
      "A restaurant POS built for the pace of service — take orders, split bills, manage the cash drawer and close the day with X & Z reports, all connected to your menu and reports.",
  },
  heroTag: "Point of sale",
  heroTitleParts: ["A ", "point of sale", " built for the pace of service"],
  heroLead:
    "Take orders, split bills and close the register in seconds. The EZOrders POS is fully connected to your menu, inventory and reports — no double entry, no surprises.",
  sessionLabel: "Session open",
  modules: [
    { name: "New order", icon: "pos" },
    { name: "Open orders", icon: "orders" },
    { name: "Open drawer", icon: "wallet" },
    { name: "Customer credit", icon: "credit" },
    { name: "Receipts", icon: "orders" },
    { name: "X & Z reports", icon: "reports" },
    { name: "Attendance", icon: "attendance" },
    { name: "More", icon: "dashboard" },
  ],
  featuresTitle: "Everything the register needs",
  featuresLead:
    "From the first tap to end-of-day, the POS keeps service moving and the numbers straight.",
  features: [
    { title: "Cash drawer & shifts", body: "Open and close drawers, manage shifts and reconcile takings with a tap." },
    { title: "X & Z reports", body: "End-of-shift and end-of-day summaries generated automatically for your accountant." },
    { title: "Customer credit & wallet", body: "Charge to house accounts and stored wallets right from the register." },
    { title: "Split & merge bills", body: "Split by guest or item and merge tables without re-keying a single order." },
    { title: "Connected to your menu", body: "Every price, modifier and item stays in sync with your live menu and inventory." },
    { title: "Attendance built in", body: "Staff clock in and out at the till, so hours and shifts stay accurate." },
  ],
  benefitsTitle: "How it helps your business",
  benefitsLead:
    "A POS that does more than ring up sales — it speeds service, cuts errors and keeps you in control.",
  benefits: [
    { title: "Faster checkout", body: "Big buttons, shortcuts and quick payment keep queues short even at peak hours." },
    { title: "Fewer errors", body: "Clear modifiers and item-level detail route the right order to the kitchen, every time." },
    { title: "Full control", body: "Live takings, shift reports and drawer reconciliation give you a clear picture of every day." },
  ],
};

const he: PosContent = {
  meta: {
    title: "קופה למסעדה — מערכת POS להזמנות ותשלומים | EZOrders",
    description:
      "קופה למסעדה שבנויה לקצב של שירות — לקחת הזמנות, לפצל חשבונות, לנהל מגירת מזומן ולסגור יום עם דוחות X ו-Z, הכול מחובר לתפריט ולדוחות.",
  },
  heroTag: "קופה",
  heroTitleParts: ["קופה ", "שבנויה לקצב", " של השירות"],
  heroLead:
    "לקחת הזמנות, לפצל חשבונות ולסגור קופה בשניות. הקופה של EZOrders מחוברת לתפריט, למלאי ולדוחות — בלי הזנה כפולה ובלי הפתעות.",
  sessionLabel: "משמרת פתוחה",
  modules: [
    { name: "הזמנה חדשה", icon: "pos" },
    { name: "הזמנות פתוחות", icon: "orders" },
    { name: "פתיחת מגירה", icon: "wallet" },
    { name: "אשראי לקוח", icon: "credit" },
    { name: "קבלות", icon: "orders" },
    { name: "דוחות X ו-Z", icon: "reports" },
    { name: "נוכחות", icon: "attendance" },
    { name: "עוד", icon: "dashboard" },
  ],
  featuresTitle: "כל מה שהקופה צריכה",
  featuresLead:
    "מהמגע הראשון ועד סוף היום — הקופה שומרת על השירות בתנועה ועל המספרים מדויקים.",
  features: [
    { title: "מגירת מזומן ומשמרות", body: "פתיחה וסגירה של מגירה, מעבר בין משמרות והתאמת קופה בלחיצה. כל פתיחת מגירה נרשמת עם השם של מי שפתח אותה ומתי, כך שכשחסרים בסוף היום ארבעים שקל יש לכם רישום לחזור אליו במקום ויכוח." },
    { title: "דוחות X ו-Z", body: "דוח X מראה איפה אתם עומדים באמצע המשמרת בלי לסגור אותה. דוח Z סוגר את היום, מאפס את המונים ונשמר כרשומה. שניהם נוצרים אוטומטית ובפורמט שרואה החשבון שלכם מקבל בלי לבקש עיבוד נוסף." },
    { title: "אשראי וארנק לקוח", body: "חשבונות בית ללקוחות קבועים וארנק צבור נטענים ומחויבים ישירות מהקופה. עובד שרואה שהיתרה נגמרה יודע את זה לפני שהוא מגיש, ולא אחרי." },
    { title: "פיצול ואיחוד חשבונות", body: "פיצול לפי סועד, לפי פריט או בחלקים שווים, ואיחוד שולחנות שהתחברו באמצע הערב. שום דבר מזה לא דורש להקליד את ההזמנה מחדש — וזה בדיוק הרגע שבו תור נתקע בשעת שיא." },
    { title: "מחובר לתפריט ולמלאי", body: "המחירים, התוספות והפריטים הם אותם נתונים שמופיעים בתפריט הדיגיטלי, באתר ובקיוסק. פריט שסומן כאזל נעלם מהקופה באותו רגע, ואף אחד לא מוכר משהו שאין." },
    { title: "נוכחות מובנית", body: "העובדים מחתימים כניסה ויציאה מאותו מסך שבו הם עובדים ממילא, בלי אפליקציה נפרדת ובלי שעון נוכחות. השעות מגיעות לשכר כשהן כבר מדויקות." },
  ],
  benefitsTitle: "איך זה תורם לעסק שלכם",
  benefitsLead:
    "קופה שעושה יותר מלהעביר מכירה — היא מזרזת שירות, מפחיתה טעויות ושומרת אתכם בשליטה.",
  benefits: [
    { title: "תשלום מהיר", body: "כפתורים גדולים, קיצורי דרך לפריטים הנמכרים ביותר ותשלום שנסגר במגע אחד. ההפרש בין קופה שלוקחת עשרים שניות לאחת שלוקחת ארבעים הוא לא נוחות — בשעת שיא הוא ההפרש בין תור שזז לתור שמתארך." },
    { title: "פחות טעויות", body: "בחירות חובה מול אופציונליות, סימון אלרגנים ופירוט ברמת הפריט מנתבים למטבח בדיוק את מה שהוזמן. מנה שחוזרת עולה פעמיים — פעם בחומרי גלם ופעם בסועד שלא יחזור." },
    { title: "שליטה מלאה", body: "פדיון חי, דוחות משמרת והתאמת מגירה נותנים תמונה ברורה בלי לחכות לסוף החודש. אתם רואים אילו שעות באמת מכניסות ואילו מנות מחזיקות את הרווחיות, ומתכננים משמרות ותפריט לפי זה." },
  ],
};

export const posContent = { en, he } as const;

export function getPosContent(locale: Locale = "en") {
  return locale === "he" ? he : en;
}
