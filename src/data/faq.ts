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
