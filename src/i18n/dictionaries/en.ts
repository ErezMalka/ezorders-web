export type Dictionary = {
    meta: { home: { title: string; description: string } };
    header: { cta: string };
    nav: { label: string; href: string; items?: { label: string; href: string }[] }[];
    footer: {
      learnMoreTitle: string;
      solutionsTitle: string;
      contactTitle: string;
      tel: string;
      rights: string;
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
    header: { cta: "Try Free for 14 Days" },
    nav: [
      { label: "Home", href: "/" },
      {
              label: "Solutions",
              href: "/solutions",
              items: [
                { label: "Restaurant ordering website", href: "/restaurant-ordering-website" },
                { label: "Digital menus", href: "/digital-menus" },
                { label: "Kiosk stands", href: "/kiosk-stands" },
                { label: "Restaurant ordering app", href: "/restaurant-ordering-app" },
                      ],
      },
      { label: "About", href: "/about" },
      { label: "Price", href: "/price" },
      { label: "Contact", href: "/contact" },
        ],
    footer: {
          learnMoreTitle: "Learn More",
          solutionsTitle: "Solutions",
          contactTitle: "Contact Us",
          tel: "Tel: *4958",
          rights: "© 2025 EZOrders | All Rights Reserved",
          learnMore: [
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: "Price", href: "/price" },
            { label: "Contact", href: "/contact" },
                ],
          solutions: [
            { label: "Restaurant ordering website", href: "/restaurant-ordering-website" },
            { label: "Digital menus", href: "/digital-menus" },
            { label: "Kiosk stands", href: "/kiosk-stands" },
            { label: "Restaurant ordering app", href: "/restaurant-ordering-app" },
                ],
    },
};
