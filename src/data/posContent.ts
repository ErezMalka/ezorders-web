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
    title: "POS – Point of Sale - ezorders",
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
    title: "קופה (POS) - ezorders",
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
    { title: "מגירת מזומן ומשמרות", body: "פתיחה וסגירה של מגירות, ניהול משמרות והתאמת קופה בלחיצה." },
    { title: "דוחות X ו-Z", body: "סיכומי סוף משמרת וסוף יום שנוצרים אוטומטית ומוכנים לרואה החשבון." },
    { title: "אשראי וארנק לקוח", body: "חיוב לחשבונות בית ולארנק צבור ישירות מהקופה." },
    { title: "פיצול ואיחוד חשבונות", body: "פיצול לפי סועד או פריט ואיחוד שולחנות — בלי להקליד הזמנה מחדש." },
    { title: "מחובר לתפריט", body: "כל מחיר, תוספת ופריט נשארים מסונכרנים עם התפריט והמלאי החי שלכם." },
    { title: "נוכחות מובנית", body: "העובדים מחתימים כניסה ויציאה בקופה, כך שהשעות והמשמרות תמיד מדויקות." },
  ],
  benefitsTitle: "איך זה תורם לעסק שלכם",
  benefitsLead:
    "קופה שעושה יותר מלהעביר מכירה — היא מזרזת שירות, מפחיתה טעויות ושומרת אתכם בשליטה.",
  benefits: [
    { title: "תשלום מהיר", body: "כפתורים גדולים, קיצורי דרך ותשלום מהיר שומרים על תורים קצרים גם בשעות העומס." },
    { title: "פחות טעויות", body: "תוספות ברורות ופירוט ברמת הפריט מנתבים את ההזמנה הנכונה למטבח, בכל פעם." },
    { title: "שליטה מלאה", body: "פדיון חי, דוחות משמרת והתאמת מגירה נותנים לכם תמונה ברורה של כל יום." },
  ],
};

export const posContent = { en, he } as const;

export function getPosContent(locale: Locale = "en") {
  return locale === "he" ? he : en;
}
