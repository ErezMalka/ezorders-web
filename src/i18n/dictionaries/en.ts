export type Dictionary = {
    meta: { home: { title: string; description: string } };
    header: { cta: string; ctaHref: string };
    nav: { label: string; href: string; items?: { label: string; href: string }[] }[];
    footer: {
      learnMoreTitle: string;
      solutionsTitle: string;
      contactTitle: string;
      tel: string;
      rights: string;
      /** The staff door back into /he/agent. Hebrew-only, so both locales point there. */
      agentPortal: { label: string; href: string };
      learnMore: { label: string; href: string }[];
      solutions: { label: string; href: string }[];
    };
};

export const en: Dictionary = {
    meta: {
          home: {
                  title: "Home - ezorders",
                  description:
                            "EZorders turns offline to online — digital menus, online ordering, kiosk stands and apps for modern restaurants.",
          },
    },
    header: { cta: "Book a Demo", ctaHref: "/en/contact" },
    nav: [
      { label: "Home", href: "/en" },
      {
              label: "Solutions",
              href: "/en/solutions",
              items: [
                { label: "Restaurant ordering website", href: "/en/restaurant-ordering-website" },
                { label: "Digital menus", href: "/en/digital-menus" },
                { label: "Kiosk stands", href: "/en/kiosk-stands" },
                { label: "Restaurant ordering app", href: "/en/restaurant-ordering-app" },
                { label: "POS – Point of sale", href: "/en/pos" },
                      ],
      },
      { label: "The Platform", href: "/en/platform" },
      { label: "About", href: "/en/about" },
      { label: "Price", href: "/en/price" },
      { label: "Blog", href: "/en/blog" },
      { label: "Contact", href: "/en/contact" },
        ],
    footer: {
          learnMoreTitle: "Learn More",
          solutionsTitle: "Solutions",
          contactTitle: "Contact Us",
          tel: "Tel: *4958",
          rights: "© 2025 EZOrders | All Rights Reserved",
          agentPortal: { label: "Agent portal", href: "/he/agent" },
          learnMore: [
            { label: "Home", href: "/en" },
            { label: "The Platform", href: "/en/platform" },
            { label: "About", href: "/en/about" },
            { label: "Price", href: "/en/price" },
            { label: "Blog", href: "/en/blog" },
            { label: "Contact", href: "/en/contact" },
                ],
          solutions: [
            { label: "Restaurant ordering website", href: "/en/restaurant-ordering-website" },
            { label: "Digital menus", href: "/en/digital-menus" },
            { label: "Kiosk stands", href: "/en/kiosk-stands" },
            { label: "Restaurant ordering app", href: "/en/restaurant-ordering-app" },
            { label: "POS – Point of sale", href: "/en/pos" },
                ],
    },
};
