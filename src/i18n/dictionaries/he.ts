import type { Dictionary } from "./en";

export const he: Dictionary = {
    meta: {
          home: {
                  title: "דף הבית - ezorders",
                  description:
                            "EZorders הופכת אופליין לאונליין — תפריטים דיגיטליים, הזמנות אונליין, עמדות קיוסק ואפליקציות למסעדות מודרניות.",
          },
    },
    header: { cta: "קבעו דמו עכשיו", ctaHref: "/he/contact" },
    nav: [
      { label: "דף הבית", href: "/he" },
      {
              label: "פתרונות",
              href: "/he/solutions",
              items: [
                { label: "אתר הזמנות למסעדה", href: "/he/restaurant-ordering-website" },
                { label: "תפריטים דיגיטליים", href: "/he/digital-menus" },
                { label: "עמדות קיוסק", href: "/he/kiosk-stands" },
                { label: "אפליקציית הזמנות למסעדה", href: "/he/restaurant-ordering-app" },
                { label: "קופה (POS)", href: "/he/pos" },
                { label: "מסך מטבח דיגיטלי (KDS)", href: "/he/kitchen-display" },
                { label: "הזמנה בסריקת QR", href: "/he/qr-ordering" },
                      ],
      },
      { label: "המערכת", href: "/he/platform" },
      { label: "אודות", href: "/he/about" },
      { label: "מחירים", href: "/he/price" },
      { label: "בלוג", href: "/he/blog" },
      { label: "צור קשר", href: "/he/contact" },
        ],
    footer: {
          learnMoreTitle: "מידע נוסף",
          solutionsTitle: "פתרונות",
          contactTitle: "צרו קשר",
          tel: "טלפון: *4958",
          rights: "© 2025 EZOrders | כל הזכויות שמורות",
          agentPortal: { label: "אזור סוכנים", href: "/he/agent" },
          learnMore: [
            { label: "דף הבית", href: "/he" },
            { label: "המערכת", href: "/he/platform" },
            { label: "אודות", href: "/he/about" },
            { label: "מחירים", href: "/he/price" },
            { label: "בלוג", href: "/he/blog" },
            { label: "מילון מונחים", href: "/he/glossary" },
            { label: "צור קשר", href: "/he/contact" },
            { label: "הצהרת נגישות", href: "/he/accessibility" },
                ],
          solutions: [
            { label: "אתר הזמנות למסעדה", href: "/he/restaurant-ordering-website" },
            { label: "תפריטים דיגיטליים", href: "/he/digital-menus" },
            { label: "עמדות קיוסק", href: "/he/kiosk-stands" },
            { label: "אפליקציית הזמנות למסעדה", href: "/he/restaurant-ordering-app" },
            { label: "קופה (POS)", href: "/he/pos" },
            { label: "מסך מטבח דיגיטלי (KDS)", href: "/he/kitchen-display" },
            { label: "הזמנה בסריקת QR", href: "/he/qr-ordering" },
            { label: "חיבור לוולט ותן ביס", href: "/he/integrations" },
                ],
          /**
           * The three interactive tools, in their own column.
           *
           * They were reachable only from whichever product page happened to
           * link to them, and two of them from nowhere at all. A visitor
           * browsing the site could not find a calculator that exists to
           * generate leads. Kept apart from the product list because they are
           * a different kind of thing: something to use, not something to buy.
           */
          toolsTitle: "כלים",
          tools: [
            { label: "מחשבון עמלות משלוחים", href: "/he/commission-calculator" },
            { label: "מחשבון עלות התור", href: "/he/queue-calculator" },
            { label: "הדמיית קיוסק מהתפריט שלכם", href: "/he/menu-mockup" },
                ],
    },
};
