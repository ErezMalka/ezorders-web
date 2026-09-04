type Locale = "en" | "he";

type Section = { heading: string; paragraphs: string[]; items?: string[] };

type Content = {
  title: string;
  intro: string;
  updated: string;
  sections: Section[];
  contactHeading: string;
  contactBody: string;
};

/**
 * Rewritten September 2026 for Amendment 13 to the Privacy Protection Law
 * (in force August 2025) and the Privacy Protection Authority's opinion on
 * consent (February 2026). The earlier text was six generic paragraphs that
 * did not name a single cookie, Google or Meta, a retention period, or the
 * visitor's right to see and delete what was collected — all of which the
 * regulator now expects to find here.
 *
 * Plain data, both languages the same shape, so neither can drift. When the
 * site starts collecting something new, add it here first.
 */
const CONTENT: Record<Locale, Content> = {
  he: {
    title: "מדיניות פרטיות",
    updated: "עודכן לאחרונה: ספטמבר 2026",
    intro:
      "EZOrders (\"אנחנו\") מכבדת את פרטיותכם. מסמך זה מסביר, בשפה פשוטה, איזה מידע נאסף באתר ezorders.com, למה, מי מקבל אותו, כמה זמן הוא נשמר, ומה הזכויות שלכם — בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981, על תיקוניו (ובכללם תיקון 13), ולהנחיות הרשות להגנת הפרטיות.",
    sections: [
      {
        heading: "מי אנחנו",
        paragraphs: [
          "האתר מופעל על ידי EZOrders, ספקית מערכות הזמנה, קופה וקיוסק למסעדות. הפנייה בכל נושא פרטיות: contact@ezorders.com, טלפון *4958.",
        ],
      },
      {
        heading: "איזה מידע אנחנו אוספים",
        paragraphs: ["אנחנו אוספים מידע בשלושה מצבים בלבד:"],
        items: [
          "כשאתם ממלאים טופס באתר (יצירת קשר, בקשת דמו, מחשבונים): שם, אימייל, טלפון, שם העסק, ההודעה, והעמוד שממנו נשלח הטופס. כמו כן, אם הגעתם מקמפיין פרסומי — פרמטרי הקמפיין (UTM, מזהה קליק של גוגל).",
          "כשאתם גולשים באתר, ורק אם אישרתם זאת בבאנר העוגיות: נתוני שימוש (עמודים שנצפו, מקור ההגעה, סוג המכשיר) ומזהי פרסום — ראו \"עוגיות\" להלן.",
          "אוטומטית, לצורך אבטחה: כתובת IP וסוג הדפדפן, לצורך הגנה מפני ספאם וניצול לרעה של הטפסים. מידע זה אינו משמש לפרופיילינג.",
        ],
      },
      {
        heading: "למה אנחנו משתמשים במידע",
        paragraphs: [],
        items: [
          "כדי להשיב לפנייתכם ולתאם דמו או הצעת מחיר — זו המטרה העיקרית, והיא לא דורשת הסכמה נפרדת.",
          "כדי לשלוח לכם דיוור שיווקי — רק אם סימנתם במפורש את תיבת ההסכמה בטופס. אפשר להסיר את עצמכם בכל עת.",
          "כדי למדוד ולשפר את האתר והקמפיינים שלנו — רק אם אישרתם עוגיות סטטיסטיקה ו/או שיווק.",
          "כדי להגן על האתר מפני ספאם וניסיונות תקיפה.",
        ],
      },
      {
        heading: "עוגיות וכלי מעקב",
        paragraphs: [
          "בכניסה הראשונה לאתר מוצג באנר עוגיות. עד שתבחרו, לא נטענים כלי מעקב כלשהם. הבחירה נשמרת בדפדפן ואפשר לשנות אותה בכל עת דרך \"הגדרות עוגיות\" בתחתית כל עמוד.",
        ],
        items: [
          "הכרחיות (תמיד פעילות): שמירת בחירת העוגיות והגדרות הנגישות שלכם, ואסימון אבטחה של Cloudflare Turnstile להגנה מספאם בטופס. אינן משמשות למעקב.",
          "סטטיסטיקה (בהסכמה): Google Analytics 4, דרך Google Tag Manager. מודד אילו עמודים נצפים ומאיפה מגיעים, בצורה מצטברת. המידע מועבר ל-Google.",
          "שיווק (בהסכמה): Google Ads (מדידת המרות והתאמת פרסום) ו-Meta Pixel של פייסבוק/אינסטגרם. כשהסכמתם לשיווק ושלחתם טופס, אנו מעבירים ל-Meta גם אירוע המרה מצד השרת (Conversions API) הכולל את האימייל והטלפון בצורה מוצפנת (hash), כדי למדוד את יעילות הפרסום. בלי הסכמה — לא מועבר דבר.",
        ],
      },
      {
        heading: "למי המידע מועבר",
        paragraphs: [
          "אנחנו לא מוכרים מידע אישי. המידע מועבר רק לספקים שמפעילים את האתר בשבילנו, ורק במידה הנדרשת:",
        ],
        items: [
          "Vercel — אחסון האתר (ארה\"ב/אירופה).",
          "Resend — שליחת פניות מהטופס לצוות שלנו במייל.",
          "Supabase (על תשתית AWS) — מערכת ניהול הלידים והפורטל שלנו.",
          "Cloudflare — הגנה מספאם בטופס.",
          "Google ו-Meta — רק בהסכמתכם לעוגיות סטטיסטיקה/שיווק, כמפורט לעיל.",
          "רשויות — אם נידרש לכך על פי דין.",
        ],
      },
      {
        heading: "כמה זמן המידע נשמר",
        paragraphs: [],
        items: [
          "פניות מהטפסים: עד 24 חודשים מהפנייה האחרונה, או עד שתבקשו למחוק.",
          "לקוחות שהתקשרו איתנו: למשך ההתקשרות ו-7 שנים לאחריה, כנדרש בדיני המס והחשבונאות.",
          "נתוני סטטיסטיקה ושיווק: לפי מדיניות השמירה של Google ו-Meta (עד 26 חודשים ב-Google Analytics).",
          "רישומי אבטחה (IP): עד 90 יום.",
        ],
      },
      {
        heading: "הזכויות שלכם",
        paragraphs: [
          "לפי חוק הגנת הפרטיות, אתם רשאים לעיין במידע שנשמר עליכם, לבקש לתקן אותו או למחוק אותו, לבטל הסכמה שנתתם (לדיוור או לעוגיות), ולהתנגד לשימוש במידע לדיוור ישיר. פנייה ל-contact@ezorders.com תיענה תוך 30 יום. אם אינכם מרוצים מהטיפול, אפשר לפנות לרשות להגנת הפרטיות.",
        ],
      },
      {
        heading: "אבטחת מידע",
        paragraphs: [
          "האתר מוגש ב-HTTPS בלבד. המידע נשמר אצל ספקים בעלי תקני אבטחה מוכרים (SOC 2 / ISO 27001), הגישה אליו מוגבלת לעובדים שזקוקים לו, וטפסים מוגנים מפני שליחה אוטומטית. אין אמצעי שמבטיח אבטחה מוחלטת, אך אנחנו פועלים לפי תקנות הגנת הפרטיות (אבטחת מידע), התשע\"ז-2017.",
        ],
      },
      {
        heading: "קטינים",
        paragraphs: ["האתר מיועד לבעלי עסקים ואינו פונה לקטינים מתחת לגיל 18. איננו אוספים ביודעין מידע על קטינים."],
      },
      {
        heading: "שינויים במדיניות",
        paragraphs: [
          "כשנעדכן את המדיניות, התאריך בראש העמוד ישתנה. שינוי מהותי באופן איסוף המידע יוצג בבאנר העוגיות ויבקש הסכמה מחדש.",
        ],
      },
    ],
    contactHeading: "צור קשר בנושא פרטיות",
    contactBody: "לכל שאלה, בקשת עיון, תיקון או מחיקה: contact@ezorders.com | *4958",
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: September 2026",
    intro:
      "EZOrders (\"we\") respects your privacy. This page explains, in plain language, what information ezorders.com collects, why, who receives it, how long it is kept, and your rights — under Israel's Protection of Privacy Law, 5741-1981, as amended (including Amendment 13), and the guidance of the Privacy Protection Authority.",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "The site is operated by EZOrders, a provider of ordering, POS and kiosk systems for restaurants. For anything privacy-related: contact@ezorders.com, phone *4958.",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: ["We collect information in three situations only:"],
        items: [
          "When you fill in a form (contact, demo request, calculators): name, email, phone, business name, your message, and the page the form was sent from. If you arrived from an ad campaign, its parameters (UTM, Google click id).",
          "When you browse, and only if you allowed it in the cookie banner: usage data (pages viewed, referrer, device type) and advertising identifiers — see \"Cookies\" below.",
          "Automatically, for security: IP address and browser type, to protect the forms from spam and abuse. Not used for profiling.",
        ],
      },
      {
        heading: "Why we use it",
        paragraphs: [],
        items: [
          "To answer your enquiry and arrange a demo or quote — the primary purpose, which needs no separate consent.",
          "To send you marketing messages — only if you explicitly ticked the consent box on the form. You can opt out at any time.",
          "To measure and improve the site and our campaigns — only if you accepted statistics and/or marketing cookies.",
          "To protect the site from spam and attacks.",
        ],
      },
      {
        heading: "Cookies and tracking",
        paragraphs: [
          "On your first visit a cookie banner appears. Until you choose, no tracking tools load. Your choice is stored in your browser and can be changed at any time via \"Cookie settings\" in the footer of every page.",
        ],
        items: [
          "Necessary (always on): remembering your cookie choice and accessibility settings, and a Cloudflare Turnstile security token that protects the form from spam. Not used for tracking.",
          "Statistics (with consent): Google Analytics 4, via Google Tag Manager. Measures which pages are viewed and where visitors come from, in aggregate. Data is transferred to Google.",
          "Marketing (with consent): Google Ads (conversion measurement and ad tailoring) and the Meta Pixel for Facebook/Instagram. If you consented to marketing and submitted a form, we also send Meta a server-side conversion event (Conversions API) containing your email and phone in hashed form, to measure ad effectiveness. Without consent, nothing is sent.",
        ],
      },
      {
        heading: "Who receives it",
        paragraphs: ["We do not sell personal information. It goes only to providers that run the site for us, and only as far as needed:"],
        items: [
          "Vercel — hosting (US/EU).",
          "Resend — delivering form submissions to our team by email.",
          "Supabase (on AWS) — our lead-management system and portal.",
          "Cloudflare — spam protection on the form.",
          "Google and Meta — only with your consent to statistics/marketing cookies, as above.",
          "Authorities — if required by law.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [],
        items: [
          "Form submissions: up to 24 months from your last contact, or until you ask us to delete them.",
          "Customers who signed with us: for the engagement and 7 years after, as tax and accounting law requires.",
          "Statistics and marketing data: per Google's and Meta's retention (up to 26 months in Google Analytics).",
          "Security logs (IP): up to 90 days.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under the Protection of Privacy Law you may access the information we hold about you, ask us to correct or delete it, withdraw consent you gave (to marketing or to cookies), and object to direct marketing. Write to contact@ezorders.com; we answer within 30 days. If you are not satisfied, you may complain to the Privacy Protection Authority.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "The site is served over HTTPS only. Data is held by providers with recognised security certifications (SOC 2 / ISO 27001), access is limited to staff who need it, and forms are protected against automated submission. No measure is absolute, but we follow the Protection of Privacy Regulations (Data Security), 5777-2017.",
        ],
      },
      {
        heading: "Minors",
        paragraphs: ["The site is for business owners and is not directed at anyone under 18. We do not knowingly collect information about minors."],
      },
      {
        heading: "Changes",
        paragraphs: [
          "When we update this policy the date at the top changes. A material change in how we collect information is announced in the cookie banner and asks for consent again.",
        ],
      },
    ],
    contactHeading: "Privacy contact",
    contactBody: "Questions, access, correction or deletion requests: contact@ezorders.com | *4958",
  },
};

export function PrivacyPolicy({ locale = "en" }: { locale?: Locale }) {
  const c = CONTENT[locale];
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-36" dir={locale === "he" ? "rtl" : "ltr"}>
      <h1 className="text-4xl font-bold leading-tight md:text-5xl">{c.title}</h1>
      <p className="mt-2 text-sm text-brand-muted">{c.updated}</p>
      <p className="mt-6 text-lg leading-relaxed text-brand-muted">{c.intro}</p>

      {c.sections.map((s) => (
        <div key={s.heading} className="mt-10">
          <h2 className="text-2xl font-bold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-brand-muted">
              {p}
            </p>
          ))}
          {s.items ? (
            <ul className="mt-3 space-y-2 ps-5 text-brand-muted">
              {s.items.map((it) => (
                <li key={it} className="list-disc leading-relaxed">
                  {it}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      <div className="mt-12 rounded-card bg-brand-grey p-8">
        <h2 className="text-2xl font-bold">{c.contactHeading}</h2>
        <p className="mt-3 leading-relaxed text-brand-muted">{c.contactBody}</p>
      </div>
    </section>
  );
}
