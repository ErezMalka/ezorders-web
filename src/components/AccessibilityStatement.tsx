type Locale = "en" | "he";

/**
 * The accessibility statement Israeli regulation asks every business website
 * to publish: what standard the site aims at, what was done, what is known
 * not to work yet, and a named contact for anyone who hits a barrier.
 *
 * Kept as plain data so the Hebrew and English versions cannot drift in
 * structure, and dated so a reader can tell whether it is current. Update the
 * date whenever the site's accessibility changes materially.
 */
const CONTENT: Record<
  Locale,
  {
    title: string;
    updated: string;
    intro: string;
    sections: { heading: string; paragraphs?: string[]; items?: string[] }[];
    contact: { heading: string; body: string; email: string; phone: string; phoneHref: string };
  }
> = {
  he: {
    title: "הצהרת נגישות",
    updated: "עודכן לאחרונה: ספטמבר 2026",
    intro:
      "EZOrders רואה חשיבות רבה במתן שירות שוויוני לכלל הציבור, ובכלל זה לאנשים עם מוגבלות. אנו משקיעים משאבים כדי שהאתר יהיה נגיש, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע\"ג-2013, ולתקן הישראלי ת\"י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA.",
    sections: [
      {
        heading: "מה נעשה באתר",
        items: [
          "האתר ניתן לניווט מלא באמצעות המקלדת, עם סימון פוקוס ברור בכל קישור וכפתור, וקישור \"דילוג לתוכן\" בראש כל עמוד.",
          "ניגודיות הצבעים בין טקסט לרקע עומדת בדרישות WCAG AA בכל רכיבי הטקסט.",
          "מבנה הכותרות היררכי ותקין, וכל עמוד נושא כותרת ראשית אחת.",
          "לכל תמונה תוכנית יש טקסט חלופי; תמונות דקורטיביות מסומנות ככאלה.",
          "העמודים בעברית מוגשים עם שפה וכיוון מסמך נכונים (lang=\"he\", dir=\"rtl\").",
          "טפסים כוללים תוויות מפורשות והודעות שגיאה ברורות.",
          "האתר מכבד את העדפת המערכת להפחתת תנועה (prefers-reduced-motion).",
          "האתר מותאם למגוון גדלי מסך ורמות הגדלה, ללא גלילה אופקית.",
        ],
      },
      {
        heading: "תפריט הנגישות",
        paragraphs: [
          "בפינה התחתונה של כל עמוד נמצא כפתור נגישות (סמל אדם בעיגול). לחיצה עליו פותחת תפריט המאפשר: הגדלת והקטנת טקסט בארבע רמות, ניגודיות גבוהה, הדגשת קישורים, גופן קריא, ריווח שורות, עצירת אנימציות וסמן עכבר גדול. ההגדרות נשמרות בדפדפן שלכם ונשארות בתוקף בין ביקורים. התפריט נגיש גם במקלדת: Tab להגעה לכפתור, Enter לפתיחה, Escape לסגירה.",
        ],
      },
      {
        heading: "מגבלות ידועות",
        paragraphs: [
          "למרות מאמצינו, ייתכן שחלקים מסוימים באתר עדיין אינם נגישים במלואם. בפרט: צילומי המסך של ממשק הניהול מוצגים כתמונות ותוכנם מתואר בטקסט חלופי מסכם; ותוכן של צדדים שלישיים (כגון מפות או סרטונים מוטמעים) כפוף לנגישות של הספק. אנו ממשיכים לשפר את הנגישות באופן שוטף.",
        ],
      },
      {
        heading: "דפדפנים וטכנולוגיות מסייעות",
        paragraphs: [
          "האתר נבדק בגרסאות העדכניות של Chrome, Firefox, Safari ו-Edge, בשילוב קורא המסך NVDA בחלונות ו-VoiceOver ב-macOS וב-iOS.",
        ],
      },
    ],
    contact: {
      heading: "רכז הנגישות — פנו אלינו",
      body: "נתקלתם בבעיית נגישות באתר, או שיש לכם הצעה לשיפור? נשמח לשמוע ולטפל בפנייה בהקדם. אנא ציינו את העמוד שבו נתקלתם בבעיה ואת תיאור התקלה.",
      email: "contact@ezorders.com",
      phone: "*4958",
      phoneHref: "tel:*4958",
    },
  },
  en: {
    title: "Accessibility statement",
    updated: "Last updated: September 2026",
    intro:
      "EZOrders is committed to making its website usable by everyone, including people with disabilities. The site is built to meet the Israeli accessibility regulations (Equal Rights for Persons with Disabilities Regulations, 2013) and Israeli Standard 5568, which is based on WCAG 2.0 level AA.",
    sections: [
      {
        heading: "What has been done",
        items: [
          "Every page can be navigated by keyboard, with a visible focus ring on every link and button and a skip-to-content link at the top.",
          "Text and background colours meet the WCAG AA contrast ratio throughout.",
          "Headings form a correct hierarchy and every page has a single main heading.",
          "Meaningful images carry alternative text; decorative ones are marked as such.",
          "Pages are served with the correct document language and direction.",
          "Forms have explicit labels and clear error messages.",
          "The site honours the system's reduced-motion preference.",
          "Layouts adapt to any screen size and zoom level without horizontal scrolling.",
        ],
      },
      {
        heading: "The accessibility menu",
        paragraphs: [
          "The button in the bottom corner of every page (a figure in a circle) opens a menu with: four levels of text size, high contrast, highlighted links, a readable font, wider line spacing, stopping animations, and a large cursor. Your choices are saved in your browser between visits. The menu works from the keyboard: Tab to the button, Enter to open, Escape to close.",
        ],
      },
      {
        heading: "Known limitations",
        paragraphs: [
          "Some parts of the site may not yet be fully accessible. In particular, screenshots of the admin panel are presented as images with summary alternative text, and third-party embedded content (maps, videos) depends on the accessibility of its provider. We keep improving.",
        ],
      },
      {
        heading: "Browsers and assistive technology",
        paragraphs: [
          "The site is tested in current versions of Chrome, Firefox, Safari and Edge, with the NVDA screen reader on Windows and VoiceOver on macOS and iOS.",
        ],
      },
    ],
    contact: {
      heading: "Accessibility coordinator — contact us",
      body: "If you encounter an accessibility barrier on this site, or have a suggestion, we would like to hear from you and will respond promptly. Please mention the page and describe the problem.",
      email: "contact@ezorders.com",
      phone: "*4958",
      phoneHref: "tel:*4958",
    },
  },
};

export function AccessibilityStatement({ locale = "he" }: { locale?: Locale }) {
  const c = CONTENT[locale];
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-36" dir={locale === "he" ? "rtl" : "ltr"}>
      <h1 className="text-4xl font-bold leading-tight md:text-5xl">{c.title}</h1>
      <p className="mt-2 text-sm text-brand-muted">{c.updated}</p>
      <p className="mt-6 text-lg leading-relaxed text-brand-muted">{c.intro}</p>

      {c.sections.map((s) => (
        <div key={s.heading} className="mt-10">
          <h2 className="text-2xl font-bold">{s.heading}</h2>
          {s.paragraphs?.map((p) => (
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
        <h2 className="text-2xl font-bold">{c.contact.heading}</h2>
        <p className="mt-3 leading-relaxed text-brand-muted">{c.contact.body}</p>
        <p className="mt-4 text-lg">
          <a href={`mailto:${c.contact.email}`} className="font-semibold text-brand-indigo underline underline-offset-2">
            {c.contact.email}
          </a>
          <span className="mx-3 text-brand-muted" aria-hidden="true">
            ·
          </span>
          <a href={c.contact.phoneHref} className="font-semibold text-brand-indigo underline underline-offset-2">
            {c.contact.phone}
          </a>
        </p>
      </div>
    </section>
  );
}
