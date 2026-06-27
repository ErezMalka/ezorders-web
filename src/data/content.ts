export const SIGNUP_URL = "https://admin.ezorders.com/#/create-account";

export const nav = [
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
] as const;

export const footerLearnMore = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Price", href: "/price" },
  { label: "Contact", href: "/contact" },
];

export const footerSolutions = [
  { label: "Restaurant ordering website", href: "/restaurant-ordering-website" },
  { label: "Digital menus", href: "/digital-menus" },
  { label: "Kiosk stands", href: "/kiosk-stands" },
  { label: "Restaurant ordering app", href: "/restaurant-ordering-app" },
];

export const homeServices = [
  {
    title: "Digital Menus",
    body: "Introducing our revolutionary Digital Menus! Say goodbye to traditional paper menus and embrace the future of dining. Browse vivid food images, personalized options, and more.",
    href: "/digital-menus",
    icon: "/icons/digital-menus.svg",
  },
  {
    title: "website",
    body: "On customer view you only users can use this version, they can explore and order foods from there.",
    href: "/restaurant-ordering-website",
    icon: "/icons/website.svg",
  },
  {
    title: "Kiosk Stands",
    body: "On this version only rides can use this. They can pick up orders from restaurants and deliver to customers",
    href: "/kiosk-stands",
    icon: "/icons/kiosk-stands.svg",
  },
  {
    title: "Applications",
    body: "On this version only rides can use this. They can pick up orders from restaurants and deliver to customers",
    href: "/restaurant-ordering-app",
    icon: "/icons/applications.svg",
  },
];

export const homeBenefits = [
  {
    title: "Digital menu boards",
    body: "Boost visual appeal and engagement with digital displays that showcase menu highlights, promotions, and real-time updates.",
  },
  {
    title: "Tablet Menus",
    body: "Enhance the dining experience with interactive tablet menus that allow guests to browse, customize, and order with ease.",
  },
  {
    title: "QR code menu",
    body: "Offer a contactless and convenient way to order. Customers simply scan, explore your menu, and complete their order directly from their device.",
  },
];

export const homeProcess = [
  {
    number: 1,
    title: "Picture your menu",
    body: "On customer view you only users can use this version, they can explore and order foods from there.",
  },
  {
    number: 2,
    title: "Review your menu",
    body: "On this stage you will go through your menu and define all the restaurant details",
  },
  {
    number: 3,
    title: "Select the required platforms",
    body: "Choose the required platforms that you willing your restaurant to appear on and enjoy of full digitization.",
  },
];

export const pricingPlans = [
  {
    price: "29",
    name: "Digital Menu",
    features: ["Interactive digital menu", "Easy real-time updates", "No printing or reprinting costs"],
    popular: false,
  },
  {
    price: "149",
    name: "Ordering Website",
    features: ["Integrations", "Multi-language support", "Order scheduling", "Branded ordering website"],
    popular: false,
  },
  {
    price: "190",
    name: "App",
    features: ["Push notifications", "Online payments", "Order tracking", "Order History"],
    popular: false,
  },
  {
    price: "200",
    name: "Kiosk Software",
    features: ["Increase Sales", "Optimized kiosk UI/UX", "Fast in-store checkout", "Unlimited integrations"],
    popular: true,
  },
];

export const testimonials = [
  {
    quote:
      "Using EZOrders has been a game-changer for our restaurant. Our customers love the convenience of placing orders online, and the seamless integration with our operations has greatly improved our efficiency.",
    name: "Sarah",
    role: "Restaurant Owner",
  },
  {
    quote:
      "EZOrders has helped us boost our sales and reach a wider audience. The easy-to-use platform and hassle-free payment options have made ordering a breeze for our customers, resulting in increased revenue for our business.",
    name: "Mark",
    role: "Restaurant Manager",
  },
  {
    quote:
      "We have seen a significant increase in customer satisfaction since implementing EZOrders. The ability for our patrons to easily customize their orders and track their delivery has created a more enjoyable dining experience for them, leading to positive reviews and repeat business.",
    name: "Amanda",
    role: "Restaurant Operator",
  },
  {
    quote:
      "Thanks to EZOrders, we have saved valuable time and resources. The streamlined order management system has eliminated errors and improved communication with our kitchen staff. Our operations have never been smoother!",
    name: "David",
    role: "Restaurant Owner",
  },
];

export const stats = [
  { value: "0", suffix: "M", label: "Client Satisfaction" },
  { value: "0", suffix: "h", label: "Expert Support Team" },
  { value: "0", suffix: "k+", label: "Sales Count" },
  { value: "0", suffix: "+", label: "Client Worldwide" },
];
