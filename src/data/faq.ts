export type FaqItem = { q: string; a: string };

/**
 * The questions a restaurant owner actually asks before signing, answered.
 *
 * Written so the FIRST SENTENCE answers the question completely. Retrieval-based
 * AI engines judge a page on its opening words and quote the sentence that
 * stands on its own — "אין התחייבות." is quotable, "בואו נדבר על זה" is not.
 * Detail follows in the sentences after.
 *
 * Every answer here is the operator's own, not marketing copy invented around a
 * question. An FAQ block with unanswered questions — which is what the English
 * product pages shipped for a long time — is worse than none: it renders an
 * accordion that opens onto nothing, and FAQPage schema cannot be built from it.
 */

export const GENERAL_FAQ: Record<"he" | "en", FaqItem[]> = {
  he: [
    {
      q: "כמה זמן לוקחת ההקמה של המערכת?",
      a: "הקמה מלאה אורכת כ-14 ימי עסקים. התהליך כולל פתיחת מסוף סליקה בשב\"א, בניית התפריט הראשוני, הטמעה במסעדה, הדרכת הצוות וסבב תיקונים לפני העלייה לאוויר.",
    },
    {
      q: "מה קורה להזמנות אם האינטרנט במסעדה נופל?",
      a: "ההזמנות לא נעלמות. הן נשמרות בענן, ואפשר לצפות בהן ולנהל אותן מכל מכשיר אחר שיש לו חיבור לאינטרנט — למשל מהטלפון הנייד שלכם.",
    },
    {
      q: "לאילו אפליקציות משלוחים המערכת מתחברת?",
      a: "המערכת מתחברת לוולט, תן ביס, סיבוס, זאפ רסט, משלוחה ו-HAAT, ולערוצים נוספים. כל ההזמנות מכל הערוצים נכנסות לאותו מסך ולאותם דוחות, בלי להקליד מחדש.",
    },
    {
      q: "אפשר להשתמש בחומרה שכבר קיימת במסעדה?",
      a: "כן, כמעט תמיד. זו קופה בענן, ולכן היא עובדת עם רוב הציוד שכבר נמצא בעסק. עם זאת אנחנו ממליצים על ציוד עדכני שנבדק מול המערכת, כדי להימנע מתקלות ולקבל ביצועים מלאים.",
    },
    {
      q: "יש התחייבות לתקופה?",
      a: "אין התחייבות בכלל. אפשר להפסיק בכל שלב, בהתראה של 30 יום מראש.",
    },
    {
      q: "מי נותן תמיכה ובאילו שעות?",
      a: "צוות התמיכה שלנו זמין בטלפון ובוואטסאפ בימים א׳–ה׳ בין 10:00 ל-18:00, לכל נושא. מעבר לשעות האלה יש תמיכת חירום, המיועדת לתקלה משביתה בלבד.",
    },
  ],
  en: [
    {
      q: "How long does setup take?",
      a: "A full setup takes about 14 business days. That covers opening a Shva payment terminal, building the initial menu, installing on site, training the team, and a round of corrections before going live.",
    },
    {
      q: "What happens to orders if the restaurant loses internet?",
      a: "Orders are not lost. They are held in the cloud, and you can view and manage them from any other device with a connection — your phone, for example.",
    },
    {
      q: "Which delivery apps does the system connect to?",
      a: "The system connects to Wolt, Tenbis, Cibus, Zap Rest, Mishloha and HAAT, among others. Orders from every channel land on the same screen and in the same reports, with no re-keying.",
    },
    {
      q: "Can I keep the hardware I already have?",
      a: "Usually, yes. It is a cloud POS, so it works with most equipment already in the business. We do recommend current hardware that has been tested against the system, to avoid faults and get full performance.",
    },
    {
      q: "Is there a minimum contract?",
      a: "There is no commitment. You can stop at any point with 30 days' notice.",
    },
    {
      q: "Who provides support, and when?",
      a: "Our support team is available by phone and WhatsApp Sunday to Thursday, 10:00 to 18:00, for anything. Outside those hours there is emergency support, for a fault that stops service.",
    },
  ],
};

/**
 * Kiosk-specific questions, shown above GENERAL_FAQ on /he/kiosk-stands.
 *
 * SCOPE, DELIBERATELY NARROW. Every answer here is either definitional or points at a page
 * that holds the real figure. None of them asserts a product capability, because the
 * capability claims a kiosk buyer actually asks about — which payment methods run on the
 * kiosk screen rather than on the ordering site, whether a kiosk order reaches the kitchen
 * display without re-keying, whether the kiosk flow is genuinely multilingual — are not
 * recorded in the approved knowledge. A capability claim needs a source; a question with no
 * sourced answer belongs in the open-questions list, not in an accordion.
 *
 * The questions were chosen from what Search Console shows this site is actually surfaced
 * for: "עמדת קיוסק מחיר", "עמדת קיוסק לעסק", "קיוסק שירות עצמי".
 */
export const KIOSK_FAQ: Record<"he" | "en", FaqItem[]> = {
  he: [
    {
      q: "מה ההבדל בין עמדת קיוסק לקופה?",
      a: "הקיוסק הוא המסך שהסועד מזמין בו בעצמו; הקופה היא המסך שהצוות עובד בו. הקיוסק מחליף את שלב קבלת ההזמנה בדלפק ולא את הקופה — רוב המסעדות מפעילות את שניהם זה לצד זה, כי חלק מהסועדים תמיד יעדיפו להזמין מול אדם.",
    },
    {
      q: "כמה עמדות קיוסק צריך למסעדה?",
      a: "התאימו את מספר העמדות להיקף ההזמנות בשעות העומס. ספרו כמה סועדים מגיעים לדלפק בחצי השעה העמוסה ביותר וכמה זמן לוקחת הזמנה ממוצעת; אפשר לעשות את החשבון הזה במחשבון התור שבאתר.",
    },
    {
      q: "האם עמדת קיוסק מתאימה גם למסעדה קטנה?",
      a: "השאלה היא לא כמה מקומות ישיבה יש אלא האם יש שעת עומס. מסעדה עם תור של עשר דקות בצהריים מרוויחה מקיוסק יותר ממסעדה גדולה שהתנועה בה מתפזרת על פני היום. אם אין אצלכם שעת שיא, קיוסק יפתור בעיה שאין לכם.",
    },
    {
      q: "כמה עולה עמדת קיוסק?",
      a: "המחיר העדכני מופיע בעמוד התמחור של EZOrders, יחד עם שאר רכיבי המערכת. שימו לב שתוספות כמו אמצעי תשלום מתומחרות בנפרד מהעמדה עצמה, אז שווה לבנות את החישוב החודשי המלא לפני ההחלטה.",
    },
  ],
  en: [
    {
      q: "What is the difference between a kiosk and a POS?",
      a: "The kiosk is the screen a guest orders on; the POS is the screen your team works on. A kiosk replaces order-taking at the counter, not the POS — most restaurants run both, because some guests will always prefer to order from a person.",
    },
    {
      q: "How many kiosks does a restaurant need?",
      a: "It follows your peak, not your size. Count the guests who reach the counter in your busiest half hour and how long an average order takes; the product is the number of stations needed so a new queue does not form at the screens instead.",
    },
    {
      q: "Is a kiosk worth it for a small restaurant?",
      a: "The question is not how many covers you have but whether you have a rush. A restaurant with a ten-minute queue at lunch gains more from a kiosk than a larger one whose traffic spreads across the day. With no peak, a kiosk solves a problem you do not have.",
    },
    {
      q: "What does a kiosk cost?",
      a: "Current pricing is on the EZOrders pricing page, alongside the rest of the system. Add-ons such as payment methods are priced separately from the station itself, so it is worth building the full monthly figure before deciding.",
    },
  ],
};

/**
 * The three questions /he/kitchen-display answers in its own body, under
 * "שאלות נפוצות על מסך מטבח". The page renders them as headings and paragraphs
 * (one answer carries a link to /he/pos), so they are restated here as plain
 * text for its FAQPage JSON-LD.
 *
 * MIRRORS THE PAGE. The wording must stay identical to what the page shows;
 * change both together.
 */
export const KDS_FAQ: Record<"he", FaqItem[]> = {
  he: [
    {
      q: "האם צריך חומרה מיוחדת?",
      a: "לא. המערכת רצה על כל מסך מגע או טאבלט עמיד למטבח. אנחנו נמליץ על תצורה לפי גודל המטבח ומספר התחנות — ממסך אחד ועד מסך לכל תחנת הכנה.",
    },
    {
      q: "מה קורה אם האינטרנט נופל?",
      a: "ההזמנות שכבר נקלטו נשמרות מקומית וממשיכות להופיע על המסך. ברגע שהחיבור חוזר, הכל מסתנכרן אוטומטית מול הקופה והדוחות.",
    },
    {
      q: "האם אפשר לחלק הזמנות בין תחנות?",
      a: "כן — מנות מתפצלות אוטומטית לפי תחנה (גריל, סלטים, בר), וכרטיס ההזמנה המרכזי מתעדכן כשכל התחנות סיימו. ההגשה יוצאת שלמה וחמה.",
    },
  ],
};
