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
                      ],
      },
      { label: "אודות", href: "/he/about" },
      { label: "מחירים", href: "/he/price" },
      { label: "צור קשר", href: "/he/contact" },
        ],
    footer: {
          learnMoreTitle: "מידע נוסף",
          solutionsTitle: "פתרונות",
          contactTitle: "צרו קשר",
          tel: "טלפון: *4958",
          rights: "© 2025 EZOrders | כל הזכויות שמורות",
          learnMore: [
            { label: "דף הבית", href: "/he" },
            { label: "אודות", href: "/he/about" },
            { label: "מחירים", href: "/he/price" },
            { label: "צור קשר", href: "/he/contact" },
                ],
          solutions: [
            { label: "אתר הזמנות למסעדה", href: "/he/restaurant-ordering-website" },
            { label: "תפריטים דיגיטליים", href: "/he/digital-menus" },
            { label: "עמדות קיוסק", href: "/he/kiosk-stands" },
            { label: "אפליקציית הזמנות למסעדה", href: "/he/restaurant-ordering-app" },
                ],
    },
};
