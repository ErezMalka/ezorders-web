import type { IconName } from "@/components/Icons";

export type Locale = "en" | "he";

export type Capability = { name: string; icon: IconName; body: string };
export type PlatformFeature = { title: string; body: string };
export type Stat = { value: string; label: string; delta?: string };
export type Chip = { name: string; icon: IconName };

export type PlatformContent = {
  meta: { title: string; description: string };

  heroTag: string;
  heroTitlePrefix: string;
  heroTitleAccent: string;
  heroTitleSuffix: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;

  // Dashboard preview (KPI mock)
  dashboardLabel: string;
  dashboardTitle: string;
  stats: Stat[];

  // Capabilities grid (also reused on the home page)
  capTitlePrefix: string;
  capTitleAccent: string;
  capTitleSuffix: string;
  capLead: string;
  capabilities: Capability[];
  // shorter copy for the home-page teaser variant
  homeCapTitlePrefix: string;
  homeCapTitleAccent: string;
  homeCapTitleSuffix: string;
  homeCapLead: string;
  homeCapCta: string;

  // POS
  posTag: string;
  posTitle: string;
  posLead: string;
  posModules: Chip[];
  posFeatures: PlatformFeature[];

  // Multi-branch / franchise
  branchesTag: string;
  branchesTitle: string;
  branchesLead: string;
  branchesFeatures: PlatformFeature[];
  branchLevels: { name: string; sub: string; icon: IconName }[];

  // Analytics
  analyticsTag: string;
  analyticsTitle: string;
  analyticsLead: string;
  analyticsFeatures: PlatformFeature[];
  reportsMock: { title: string; rows: { label: string; value: number }[] };

  // Loyalty & wallet
  loyaltyTag: string;
  loyaltyTitle: string;
  loyaltyLead: string;
  loyaltyFeatures: PlatformFeature[];
  loyaltyCards: Chip[];
};

const en: PlatformContent = {
  meta: {
    title: "The Platform - ezorders",
    description:
      "One system to run your whole restaurant — POS, orders, digital menu, loyalty, couriers, staff and multi-branch management, with real-time reports and analytics.",
  },

  heroTag: "The EZOrders Platform",
  heroTitlePrefix: "Run your entire restaurant from ",
  heroTitleAccent: "one system",
  heroTitleSuffix: "",
  heroLead:
    "POS, orders, menu, loyalty, couriers, staff and multi-branch control — every part of the operation connected in real time, on any device.",
  ctaPrimary: "Try Free for 14 Days",
  ctaSecondary: "Talk to us",

  dashboardLabel: "Live dashboard",
  dashboardTitle: "Restaurant overview",
  stats: [
    { value: "₪4,899K", label: "Revenue", delta: "+12.4%" },
    { value: "398", label: "Orders today", delta: "+38" },
    { value: "₪72", label: "Avg. basket", delta: "+5%" },
    { value: "12", label: "Active branches" },
  ],

  capTitlePrefix: "Everything in ",
  capTitleAccent: "one platform",
  capTitleSuffix: "",
  capLead:
    "From the front counter to the back office — EZOrders brings every module a modern restaurant needs into a single, connected system.",
  capabilities: [
    { name: "Management dashboard", icon: "dashboard", body: "A live overview of revenue, orders and performance across the business." },
    { name: "POS", icon: "pos", body: "Fast point-of-sale for counter, table and takeaway orders." },
    { name: "Orders", icon: "orders", body: "Every online, kiosk and in-store order in one queue." },
    { name: "Digital menu", icon: "menu", body: "Update items, prices and availability in seconds." },
    { name: "Products & inventory", icon: "products", body: "Manage items, modifiers, stock and combos with ease." },
    { name: "Sales", icon: "sales", body: "Track takings by branch, channel, shift and product." },
    { name: "Loyalty club", icon: "loyalty", body: "Points, coupons and campaigns that bring customers back." },
    { name: "Digital wallet", icon: "wallet", body: "Stored balance and customer credit for faster checkout." },
    { name: "Reports", icon: "reports", body: "X & Z reports, end-of-day and financial summaries." },
    { name: "Analytics", icon: "analytics", body: "Trends and insights that show what to do next." },
    { name: "Branches & chains", icon: "branches", body: "Manage many branches and franchises from one place." },
    { name: "Couriers", icon: "couriers", body: "Assign, dispatch and track deliveries end to end." },
    { name: "Employees", icon: "employees", body: "Staff profiles, shifts and role-based access." },
    { name: "Attendance", icon: "attendance", body: "Clock-in, clock-out and hours, built in." },
    { name: "Roles & permissions", icon: "roles", body: "Give every user exactly the access they need." },
    { name: "Feedback", icon: "feedback", body: "Collect reviews and ratings straight from customers." },
  ],
  homeCapTitlePrefix: "One system, ",
  homeCapTitleAccent: "every tool",
  homeCapTitleSuffix: " you need",
  homeCapLead:
    "Behind the menus and apps sits a full management platform — POS, orders, loyalty, couriers, staff and reports, all connected.",
  homeCapCta: "Explore the platform",

  posTag: "Point of sale",
  posTitle: "A POS built for the pace of service",
  posLead:
    "Take orders, split bills and close the register in seconds. The POS is fully connected to your menu, inventory and reports — no double entry, no surprises.",
  posModules: [
    { name: "New order", icon: "pos" },
    { name: "Open orders", icon: "orders" },
    { name: "Customer credit", icon: "credit" },
    { name: "Receipts", icon: "orders" },
    { name: "X & Z reports", icon: "reports" },
    { name: "Attendance", icon: "attendance" },
  ],
  posFeatures: [
    { title: "Cash drawer & shifts", body: "Open and close drawers, manage shifts and reconcile takings with a tap." },
    { title: "X & Z reports", body: "End-of-shift and end-of-day summaries generated automatically." },
    { title: "Customer credit", body: "Charge to house accounts and stored wallets right from the register." },
  ],

  branchesTag: "Multi-branch & franchise",
  branchesTitle: "From one location to a whole chain",
  branchesLead:
    "Whether you run a single café or a franchise network, EZOrders scales with you. Manage every branch centrally, keep menus and pricing in sync, and give each site the control it needs.",
  branchesFeatures: [
    { title: "Central control", body: "Super-admin, franchise and branch levels with the right view for each." },
    { title: "Roles & permissions", body: "Fine-grained access so every team member sees only what they should." },
    { title: "Synced menus & pricing", body: "Push updates across branches instantly, or tailor them per site." },
  ],
  branchLevels: [
    { name: "Super-admin", sub: "Full control across the business", icon: "roles" },
    { name: "Franchise admin", sub: "Manage a chain and its branches", icon: "branches" },
    { name: "Branch", sub: "Day-to-day operations on site", icon: "pos" },
  ],

  analyticsTag: "Reports & analytics",
  analyticsTitle: "Decisions backed by real numbers",
  analyticsLead:
    "See revenue, orders and performance the moment they happen. Drill into any branch, channel or shift and turn raw data into clear, confident decisions.",
  analyticsFeatures: [
    { title: "Real-time dashboard", body: "Revenue, orders and average basket updating live across the business." },
    { title: "Financial reports", body: "Daily takings, VAT and end-of-day figures ready for your accountant." },
    { title: "Product & sales insights", body: "Spot best-sellers, quiet hours and upsell opportunities at a glance." },
  ],
  reportsMock: {
    title: "Sales by channel",
    rows: [
      { label: "Website", value: 34 },
      { label: "App", value: 28 },
      { label: "Kiosk", value: 22 },
      { label: "POS", value: 16 },
    ],
  },

  loyaltyTag: "Loyalty & retention",
  loyaltyTitle: "Turn one-time diners into regulars",
  loyaltyLead:
    "A built-in loyalty club and digital wallet keep customers coming back. Reward points, run campaigns and let guests pay from a stored balance — all connected to their order history.",
  loyaltyFeatures: [
    { title: "Points & rewards", body: "Earn-and-burn points that customers can redeem anywhere you sell." },
    { title: "Coupons & campaigns", body: "Launch targeted offers and scratch coupons in a few clicks." },
    { title: "Digital wallet", body: "Stored balance and credit for faster, smoother repeat orders." },
  ],
  loyaltyCards: [
    { name: "Loyalty club", icon: "loyalty" },
    { name: "Digital wallet", icon: "wallet" },
    { name: "Customer credit", icon: "credit" },
    { name: "Feedback", icon: "feedback" },
  ],
};

const he: PlatformContent = {
  meta: {
    title: "מערכת ניהול מסעדה אחת — הזמנות, מטבח ודוחות | EZOrders",
    description:
      "מערכת אחת לניהול כל המסעדה — קופה, הזמנות, תפריט דיגיטלי, מועדון לקוחות, שליחים, עובדים וניהול רב-סניפי, עם דוחות ואנליטיקה בזמן אמת.",
  },

  heroTag: "פלטפורמת EZOrders",
  heroTitlePrefix: "לנהל את כל המסעדה ",
  heroTitleAccent: "ממערכת אחת",
  heroTitleSuffix: "",
  heroLead:
    "קופה, הזמנות, תפריט, מועדון לקוחות, שליחים, עובדים וניהול רב-סניפי — כל חלקי התפעול מחוברים בזמן אמת, מכל מכשיר.",
  ctaPrimary: "התנסות חינם ל-14 יום",
  ctaSecondary: "דברו איתנו",

  dashboardLabel: "דשבורד חי",
  dashboardTitle: "מבט-על על המסעדה",
  stats: [
    { value: "₪4,899K", label: "הכנסות", delta: "+12.4%" },
    { value: "398", label: "הזמנות היום", delta: "+38" },
    { value: "₪72", label: "סל ממוצע", delta: "+5%" },
    { value: "12", label: "סניפים פעילים" },
  ],

  capTitlePrefix: "הכול ב",
  capTitleAccent: "פלטפורמה אחת",
  capTitleSuffix: "",
  capLead:
    "מהעמדה בקדמת המסעדה ועד למשרד האחורי — EZOrders מרכזת את כל המודולים שמסעדה מודרנית צריכה במערכת אחת מחוברת.",
  capabilities: [
    { name: "דשבורד ניהול", icon: "dashboard", body: "מבט חי על הכנסות, הזמנות וביצועים בכל העסק." },
    { name: "קופה (POS)", icon: "pos", body: "קופה מהירה לעמדה, לשולחן ולאיסוף עצמי." },
    { name: "הזמנות", icon: "orders", body: "כל ההזמנות — אונליין, קיוסק ובמקום — בתור אחד." },
    { name: "תפריט דיגיטלי", icon: "menu", body: "עדכון פריטים, מחירים וזמינות בשניות." },
    { name: "מוצרים ומלאי", icon: "products", body: "ניהול פריטים, תוספות, מלאי וקומבו בקלות." },
    { name: "מכירות", icon: "sales", body: "מעקב מכירות לפי סניף, ערוץ, משמרת ומוצר." },
    { name: "מועדון לקוחות", icon: "loyalty", body: "נקודות, קופונים וקמפיינים שמחזירים לקוחות." },
    { name: "ארנק דיגיטלי", icon: "wallet", body: "יתרה צבורה ואשראי לקוח לתשלום מהיר." },
    { name: "דוחות", icon: "reports", body: "דוחות X ו-Z, סוף יום וסיכומים פיננסיים." },
    { name: "אנליטיקה", icon: "analytics", body: "מגמות ותובנות שמראות מה לעשות הלאה." },
    { name: "סניפים ורשתות", icon: "branches", body: "ניהול ריבוי סניפים וזכיינות ממקום אחד." },
    { name: "שליחים", icon: "couriers", body: "שיבוץ, שיגור ומעקב משלוחים מקצה לקצה." },
    { name: "עובדים", icon: "employees", body: "פרופילי עובדים, משמרות והרשאות לפי תפקיד." },
    { name: "נוכחות", icon: "attendance", body: "כניסה, יציאה ושעות עבודה — מובנה במערכת." },
    { name: "הרשאות ותפקידים", icon: "roles", body: "לכל משתמש בדיוק את הגישה שהוא צריך." },
    { name: "משובים", icon: "feedback", body: "איסוף ביקורות ודירוגים ישירות מהלקוחות." },
  ],
  homeCapTitlePrefix: "מערכת אחת, ",
  homeCapTitleAccent: "כל הכלים",
  homeCapTitleSuffix: " שצריך",
  homeCapLead:
    "מאחורי התפריטים והאפליקציות עומדת פלטפורמת ניהול מלאה — קופה, הזמנות, מועדון, שליחים, עובדים ודוחות, הכול מחובר.",
  homeCapCta: "לגלות את המערכת",

  posTag: "קופה",
  posTitle: "קופה שבנויה לקצב של שירות",
  posLead:
    "לקחת הזמנות, לפצל חשבונות ולסגור קופה בשניות. הקופה מחוברת לתפריט, למלאי ולדוחות — בלי הזנה כפולה ובלי הפתעות.",
  posModules: [
    { name: "הזמנה חדשה", icon: "pos" },
    { name: "הזמנות פתוחות", icon: "orders" },
    { name: "אשראי לקוח", icon: "credit" },
    { name: "קבלות", icon: "orders" },
    { name: "דוחות X ו-Z", icon: "reports" },
    { name: "נוכחות", icon: "attendance" },
  ],
  posFeatures: [
    { title: "מגירת מזומן ומשמרות", body: "פתיחה וסגירה של מגירות, ניהול משמרות והתאמת קופה בלחיצה." },
    { title: "דוחות X ו-Z", body: "סיכומי סוף משמרת וסוף יום שנוצרים אוטומטית." },
    { title: "אשראי לקוח", body: "חיוב לחשבונות בית ולארנק צבור ישירות מהקופה." },
  ],

  branchesTag: "רב-סניפי וזכיינות",
  branchesTitle: "מסניף אחד ועד רשת שלמה",
  branchesLead:
    "בין אם אתם בית קפה בודד או רשת זכיינות — EZOrders גדלה איתכם. נהלו כל סניף באופן מרכזי, שמרו על תפריטים ומחירים מסונכרנים, ותנו לכל אתר את השליטה שהוא צריך.",
  branchesFeatures: [
    { title: "שליטה מרכזית", body: "רמות סופר-אדמין, זכיין וסניף — לכל אחד התצוגה המתאימה לו." },
    { title: "הרשאות ותפקידים", body: "גישה מדויקת כך שכל איש צוות רואה רק את מה שצריך." },
    { title: "תפריטים ומחירים מסונכרנים", body: "עדכון מיידי לכל הסניפים, או התאמה אישית לכל אתר." },
  ],
  branchLevels: [
    { name: "סופר-אדמין", sub: "שליטה מלאה על כל העסק", icon: "roles" },
    { name: "מנהל זכיינות", sub: "ניהול רשת וכל הסניפים שלה", icon: "branches" },
    { name: "סניף", sub: "התפעול היומיומי באתר", icon: "pos" },
  ],

  analyticsTag: "דוחות ואנליטיקה",
  analyticsTitle: "החלטות שמגובות במספרים אמיתיים",
  analyticsLead:
    "לראות הכנסות, הזמנות וביצועים ברגע שהם קורים. להעמיק לכל סניף, ערוץ או משמרת ולהפוך נתונים גולמיים להחלטות ברורות ובטוחות.",
  analyticsFeatures: [
    { title: "דשבורד בזמן אמת", body: "הכנסות, הזמנות וסל ממוצע שמתעדכנים חי בכל העסק." },
    { title: "דוחות פיננסיים", body: "פדיון יומי, מע\"מ ונתוני סוף יום מוכנים לרואה החשבון." },
    { title: "תובנות מוצר ומכירות", body: "לזהות מוצרים מובילים, שעות שקטות והזדמנויות אפסייל במבט." },
  ],
  reportsMock: {
    title: "מכירות לפי ערוץ",
    rows: [
      { label: "אתר", value: 34 },
      { label: "אפליקציה", value: 28 },
      { label: "קיוסק", value: 22 },
      { label: "קופה", value: 16 },
    ],
  },

  loyaltyTag: "נאמנות ושימור",
  loyaltyTitle: "להפוך סועד חד-פעמי ללקוח קבוע",
  loyaltyLead:
    "מועדון לקוחות מובנה וארנק דיגיטלי שומרים על הלקוחות חוזרים. צברו נקודות, הריצו קמפיינים ואפשרו תשלום מיתרה צבורה — הכול מחובר להיסטוריית ההזמנות.",
  loyaltyFeatures: [
    { title: "נקודות ותגמולים", body: "צבירה ומימוש נקודות שהלקוחות יכולים לנצל בכל נקודת מכירה." },
    { title: "קופונים וקמפיינים", body: "השקת מבצעים ממוקדים וקופוני גירוד בכמה לחיצות." },
    { title: "ארנק דיגיטלי", body: "יתרה צבורה ואשראי להזמנות חוזרות מהירות וחלקות." },
  ],
  loyaltyCards: [
    { name: "מועדון לקוחות", icon: "loyalty" },
    { name: "ארנק דיגיטלי", icon: "wallet" },
    { name: "אשראי לקוח", icon: "credit" },
    { name: "משובים", icon: "feedback" },
  ],
};

export const platformContent = { en, he } as const;

export function getPlatformContent(locale: Locale = "en") {
  return locale === "he" ? platformContent.he : platformContent.en;
}
