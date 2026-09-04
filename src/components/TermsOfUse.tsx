type Locale = "en" | "he";

type Section = { heading: string; paragraphs: string[] };

/**
 * Terms of use for the marketing website. Deliberately about the WEBSITE —
 * browsing it, the calculators, sending a form — and not about the product:
 * the service itself is governed by the signed agreement each customer
 * receives from the agent portal, and these terms say so rather than trying
 * to restate it.
 */
const CONTENT: Record<Locale, { title: string; updated: string; intro: string; sections: Section[] }> = {
  he: {
    title: "תנאי שימוש באתר",
    updated: "עודכן לאחרונה: ספטמבר 2026",
    intro:
      "ברוכים הבאים לאתר ezorders.com (\"האתר\"), המופעל על ידי EZOrders (\"החברה\"). הגלישה באתר והשימוש בו מהווים הסכמה לתנאים אלה. אם אינכם מסכימים, אנא הימנעו משימוש באתר. התנאים מנוסחים בלשון זכר מטעמי נוחות בלבד ומיועדים לכל המינים.",
    sections: [
      {
        heading: "1. מהות האתר",
        paragraphs: [
          "האתר מציג מידע על מוצרי ושירותי החברה — מערכות קופה, קיוסק, אתרי ואפליקציות הזמנה, מסכי מטבח, מועדון לקוחות ואינטגרציות — ומאפשר ליצור קשר, לבקש הדגמה ולקבל הערכת מחיר. האתר אינו מבצע מכירה ישירה; ההתקשרות עם החברה נעשית בהסכם נפרד וחתום, שתנאיו גוברים על האמור כאן.",
        ],
      },
      {
        heading: "2. מחשבונים והערכות מחיר",
        paragraphs: [
          "מחשבון המחירים, מחשבון העמלות, מחשבון עלות התור והדמיית התפריט מספקים הערכה בלבד, על בסיס הנתונים שהזנתם ומחירון החברה כפי שהוא מוצג באתר במועד השימוש. המחירים באתר הם לפני מע\"מ, ניתנים לשינוי ללא הודעה מוקדמת, ואינם מהווים הצעה מחייבת. הצעת מחיר מחייבת נשלחת רק בכתב על ידי נציג החברה.",
        ],
      },
      {
        heading: "3. שימוש מותר",
        paragraphs: [
          "מותר להשתמש באתר למטרות חוקיות בלבד ובאופן אישי. אין להעתיק, לשכפל, להפיץ או לפרסם תוכן מהאתר ללא אישור בכתב; אין להשתמש באמצעים אוטומטיים (סורקים, בוטים) לאיסוף מידע מהאתר; אין לשלוח דרך הטפסים תוכן מטעה, פוגעני או שאינו שלכם; ואין לנסות לפגוע בזמינות האתר או באבטחתו.",
        ],
      },
      {
        heading: "4. קניין רוחני",
        paragraphs: [
          "כל התכנים באתר — טקסטים, עיצובים, לוגו, סימני מסחר, צילומי מסך, תמונות וקוד — הם קניינה של החברה או של צדדים שלישיים שהתירו לה את השימוש, ומוגנים בדיני זכויות יוצרים וסימני מסחר. השם EZOrders והלוגו הם סימני מסחר של החברה. שמות של פלטפורמות צד שלישי (וולט, תן ביס, סיבוס וכדומה) שייכים לבעליהם ומוזכרים לצורך תיאור האינטגרציות בלבד.",
        ],
      },
      {
        heading: "5. פרטיות",
        paragraphs: [
          "השימוש במידע אישי שנמסר באתר מוסדר במדיניות הפרטיות, המהווה חלק בלתי נפרד מתנאים אלה. שליחת טופס אינה מהווה הסכמה לדיוור שיווקי — לכך נדרש סימון מפורש של תיבת ההסכמה.",
        ],
      },
      {
        heading: "6. קישורים לאתרים חיצוניים",
        paragraphs: [
          "האתר עשוי לכלול קישורים לאתרים של צדדים שלישיים (פלטפורמות משלוחים, ספקי ציוד, רשתות חברתיות). החברה אינה אחראית לתוכנם, לזמינותם או למדיניות הפרטיות שלהם.",
        ],
      },
      {
        heading: "7. אחריות",
        paragraphs: [
          "האתר ותכניו מוצעים כפי שהם (As Is). החברה משתדלת שהמידע יהיה מדויק ועדכני, אך אינה מתחייבת לכך, ולא תישא באחריות לנזק ישיר או עקיף שייגרם מהסתמכות על תוכן האתר, מהערכת מחיר שהתקבלה במחשבון, או מהפרעה בזמינות האתר. אין באמור כדי לגרוע מאחריות שאינה ניתנת להגבלה על פי דין.",
        ],
      },
      {
        heading: "8. שינויים",
        paragraphs: [
          "החברה רשאית לעדכן תנאים אלה מעת לעת; הנוסח המחייב הוא זה המפורסם באתר במועד השימוש, והתאריך בראש העמוד מציין את העדכון האחרון.",
        ],
      },
      {
        heading: "9. דין וסמכות שיפוט",
        paragraphs: [
          "על תנאים אלה יחול הדין הישראלי בלבד. סמכות השיפוט הבלעדית בכל עניין הנוגע לאתר נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.",
        ],
      },
      {
        heading: "10. יצירת קשר",
        paragraphs: ["לשאלות בנוגע לתנאים אלה: contact@ezorders.com, טלפון *4958."],
      },
    ],
  },
  en: {
    title: "Website terms of use",
    updated: "Last updated: September 2026",
    intro:
      "Welcome to ezorders.com (the \"Site\"), operated by EZOrders (the \"Company\"). By browsing or using the Site you agree to these terms. If you do not agree, please do not use the Site.",
    sections: [
      {
        heading: "1. What the Site is",
        paragraphs: [
          "The Site presents the Company's products and services — POS, kiosk, ordering websites and apps, kitchen displays, loyalty and integrations — and lets you contact us, request a demo and get a price estimate. The Site does not sell directly; engagements with the Company are made under a separate signed agreement, whose terms prevail over anything here.",
        ],
      },
      {
        heading: "2. Calculators and estimates",
        paragraphs: [
          "The price calculator, commission calculator, queue-cost calculator and menu mockup provide estimates only, based on what you enter and the Company's price list as shown on the Site at the time. Prices are before VAT, may change without notice, and are not a binding offer. A binding quote is issued only in writing by a Company representative.",
        ],
      },
      {
        heading: "3. Permitted use",
        paragraphs: [
          "You may use the Site for lawful purposes and personal use only. You may not copy, reproduce, distribute or publish Site content without written permission; use automated means (scrapers, bots) to collect information from the Site; submit misleading, offensive or third-party content through the forms; or attempt to disrupt the Site's availability or security.",
        ],
      },
      {
        heading: "4. Intellectual property",
        paragraphs: [
          "All Site content — text, design, logo, trademarks, screenshots, images and code — belongs to the Company or to third parties who have licensed it, and is protected by copyright and trademark law. EZOrders and its logo are trademarks of the Company. Third-party platform names (Wolt, Tenbis, Cibus and others) belong to their owners and are mentioned only to describe the integrations.",
        ],
      },
      {
        heading: "5. Privacy",
        paragraphs: [
          "The use of personal information submitted on the Site is governed by the Privacy Policy, which forms part of these terms. Sending a form is not consent to marketing messages — that requires explicitly ticking the consent box.",
        ],
      },
      {
        heading: "6. External links",
        paragraphs: [
          "The Site may link to third-party sites (delivery platforms, hardware suppliers, social networks). The Company is not responsible for their content, availability or privacy practices.",
        ],
      },
      {
        heading: "7. Liability",
        paragraphs: [
          "The Site and its content are provided as is. The Company tries to keep the information accurate and current but does not guarantee it, and will not be liable for direct or indirect damage arising from reliance on Site content, an estimate obtained from a calculator, or interruption of the Site. Nothing here limits liability that cannot be limited by law.",
        ],
      },
      {
        heading: "8. Changes",
        paragraphs: [
          "The Company may update these terms from time to time; the binding version is the one published on the Site at the time of use, and the date at the top marks the latest update.",
        ],
      },
      {
        heading: "9. Governing law",
        paragraphs: [
          "These terms are governed by the laws of the State of Israel. The competent courts of the Tel Aviv-Jaffa district have exclusive jurisdiction over any matter concerning the Site.",
        ],
      },
      {
        heading: "10. Contact",
        paragraphs: ["Questions about these terms: contact@ezorders.com, phone *4958."],
      },
    ],
  },
};

export function TermsOfUse({ locale = "he" }: { locale?: Locale }) {
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
        </div>
      ))}
    </section>
  );
}
