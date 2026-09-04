/**
 * Restaurant technology terms, defined in Hebrew.
 *
 * Every one of these is something a restaurant owner meets while shopping for
 * a system and is expected to already understand. The Hebrew-language material
 * explaining them is thin, so each is a real query with almost nobody
 * answering it properly — and a definition is the shape of content an AI
 * assistant quotes rather than paraphrases.
 *
 * Written to be useful to someone who never becomes a customer. A definition
 * that argues for a product is not a definition, and it is also the version
 * nobody links to.
 */

export type GlossaryTerm = {
  /** The headword, as an owner would search for it. */
  term: string;
  /** Alternate spellings and the English original, for search and for schema. */
  aliases?: string[];
  /** One sentence that stands alone as an answer. */
  short: string;
  /** The part a vendor usually leaves out. */
  detail: string;
  /** Where on the site this is actually implemented, when there is such a page. */
  href?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "קופה ממוחשבת (POS)",
    aliases: ["POS", "Point of Sale", "נקודת מכירה"],
    short:
      "המערכת שדרכה נרשמת ההזמנה, נגבה התשלום ונסגרת המשמרת — הנקודה שבה מכירה הופכת לרישום.",
    detail:
      "בעברית משתמשים ב\"קופה\" גם למכשיר וגם לתוכנה, וזה מקור בלבול נפוץ בשיחות מכירה. המכשיר הוא מסך ומגירה; מה שקובע אם המערכת מתאימה לכם הוא התוכנה שרצה עליו — איך היא מטפלת בתוספות, בפיצול חשבון, בערוצים חיצוניים ובסגירת יום.",
    href: "/he/pos",
  },
  {
    term: "דוח X",
    aliases: ["X Report", "דוח איקס"],
    short: "סיכום ביניים של המשמרת שאפשר להפיק בלי לסגור אותה.",
    detail:
      "משמש כדי לראות איפה עומדים באמצע היום, לבדוק התאמה של מגירה בהחלפת משמרת, או לבדוק חשד לפער — בלי לאפס את המונים. אפשר להפיק אותו כמה פעמים שרוצים.",
    href: "/he/pos",
  },
  {
    term: "דוח Z",
    aliases: ["Z Report", "דוח זד", "סגירת יום"],
    short: "סגירת היום: מסכם את כל הפעילות, מאפס את המונים ונשמר כרשומה.",
    detail:
      "בניגוד לדוח X, דוח Z מופק פעם אחת בסוף היום והוא בלתי הפיך. זה המסמך שרואה החשבון עובד מולו, ולכן חשוב שהמערכת תפיק אותו אוטומטית ובפורמט שאפשר להעביר הלאה בלי עיבוד ידני.",
    href: "/he/pos",
  },
  {
    term: "KDS — מסך מטבח דיגיטלי",
    aliases: ["KDS", "Kitchen Display System", "מסך מטבח"],
    short: "מסך שמחליף את הבונים המודפסים ומציג למטבח את ההזמנות הפתוחות בזמן אמת.",
    detail:
      "היתרון האמיתי הוא לא חיסכון בנייר אלא סדר: ההזמנות מכל הערוצים מגיעות לאותו תור, עם טיימר לכל אחת, וסטטוס שמתעדכן בלי שמישהו יצטרך לצעוק. בונה מודפס שנפל מהשיש נעלם; הזמנה על מסך נשארת עד שמישהו סוגר אותה.",
    href: "/he/kitchen-display",
  },
  {
    term: "שבא",
    aliases: ["Shva", "מסוף שבא", "מסוף סליקה"],
    short: "החברה שמפעילה את תשתית סליקת האשראי בישראל. כל בית עסק שסולק אשראי עובר דרכה.",
    detail:
      "פתיחת מסוף היא תהליך נפרד מהתקנת הקופה, עם טפסים ולוח זמנים משלו, והיא לרוב מה שקובע כמה זמן לוקח מעבר בין מערכות. שווה לברר מראש מול כל ספק אם הוא מטפל בזה כחלק מההטמעה או משאיר את זה לכם.",
  },
  {
    term: "סליקה מול הנפקה",
    aliases: ["Acquiring", "Issuing", "חברת סליקה"],
    short:
      "סליקה היא הצד של בית העסק — מי שמעביר לכם את הכסף. הנפקה היא הצד של הלקוח — מי שהנפיק לו את הכרטיס.",
    detail:
      "ההבחנה חשובה כי עמלת הסליקה מגיעה מגורם אחר לגמרי מספק הקופה, ולא תמיד מוזכרת בפגישת המכירה. כשמשווים עלות בין ספקים, ודאו שאתם משווים את אותם רכיבים.",
  },
  {
    term: "מספר הקצאה",
    aliases: ["חשבונית ישראל", "Allocation Number"],
    short:
      "מספר שרשות המסים מקצה לחשבונית מס מעל סכום מסוים, ובלעדיו הלקוח לא יכול לקזז מע\"מ.",
    detail:
      "רלוונטי למסעדה בעיקר בחיוב חברות, קייטרינג ואירועים — לא בהזמנה רגילה של סועד. הסף יורד בשלבים לאורך התקופה, ולכן שווה לוודא מול רואה החשבון שלכם מה הסף התקף כרגע ואיך המערכת שלכם מטפלת בזה.",
  },
  {
    term: "סל ממוצע",
    aliases: ["Average Ticket", "AOV", "הזמנה ממוצעת"],
    short: "סכום ההזמנה הממוצע — סך הפדיון חלקי מספר ההזמנות.",
    detail:
      "המדד שהכי קל להזיז בלי להעלות מחירים: הצעה נכונה ברגע הנכון מוסיפה פריט להזמנה שכבר קורית. שווה למדוד אותו בנפרד לכל ערוץ, כי הזמנה מקיוסק, מהאתר ומהדלפק כמעט תמיד נראות אחרת.",
  },
  {
    term: "אפסייל",
    aliases: ["Upsell", "Cross-sell", "מכירה נלווית"],
    short: "הצעה להוסיף או לשדרג פריט בזמן ההזמנה.",
    detail:
      "ההבדל בין אפסייל שעובד לאחד שמעצבן הוא תזמון ורלוונטיות, לא כמות. מערכת שמציעה את אותו דבר לכולם בכל הזמנה נלמדת מהר ומתעלמים ממנה.",
  },
  {
    term: "תפריט דיגיטלי",
    aliases: ["Digital Menu", "תפריט QR"],
    short: "תפריט שהסועד פותח במכשיר שלו, לרוב בסריקת QR, ושמתעדכן מהמערכת.",
    detail:
      "עיקר הערך הוא בעדכון: פריט שאזל מסומן פעם אחת ונעלם מכל מקום. תפריט דיגיטלי שהוא קובץ PDF שהעליתם פעם אחת הוא תפריט מודפס עם שלב נוסף.",
    href: "/he/digital-menus",
  },
  {
    term: "עמדת קיוסק",
    aliases: ["Kiosk", "Self-Order Kiosk", "הזמנה עצמית"],
    short: "עמדת מסך מגע שבה הסועד מזמין ומשלם בעצמו, בלי איש צוות.",
    detail:
      "החומרה היא הקונכייה; מה שקובע אם הקיוסק עוזר או רק מוסיף מסך להשגיח עליו הוא התוכנה — האם ההזמנה שנוצרת מתנהגת כמו כל הזמנה אחרת, מגיעה לאותו מסך מטבח ונספרת באותו דוח.",
    href: "/he/kiosk-stands",
  },
  {
    term: "אינטגרציה",
    aliases: ["Integration", "חיבור"],
    short: "חיבור שבו שתי מערכות מעבירות ביניהן נתונים אוטומטית, בלי הקלדה חוזרת.",
    detail:
      "המילה נמתחת הרבה בשיחות מכירה. הבדיקה המעשית פשוטה: אם פריט שסימנתם כאזל לא נעלם גם באפליקציית המשלוחים, או אם יש טאבלט נפרד על השיש שמישהו מקליד ממנו — זו לא אינטגרציה.",
    href: "/he/integrations",
  },
];
