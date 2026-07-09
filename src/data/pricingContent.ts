import type { Locale } from "@/data/homeContent";

export type PricingPlan = { price: string; name: string; features: string[]; popular: boolean };
export type StatItem = { value: string; suffix: string; label: string };
export type TestimonialItem = { quote: string; name: string; role: string };

type PricingContent = {
badge: string;
titleAccent: string;
titleRest: string;
lead: string;
monthly: string;
yearly: string;
perMonth: string;
mostPopular: string;
choosePlan: string;
plans: PricingPlan[];
statsTitle: string;
stats: StatItem[];
testimonialsTitle: string;
testimonialsLead: string;
testimonials: TestimonialItem[];
};

const en: PricingContent = {
badge: "Pricing",
titleAccent: "Plans",
titleRest: " & Pricing",
lead: "Whether your time-saving automation needs are large or small, we\u2019re here to help you scale.",
monthly: "MONTHLY",
yearly: "YEARLY",
perMonth: "/month",
mostPopular: "MOST POPULAR",
choosePlan: "Choose plan",
plans: [
{ price: "29", name: "Digital Menu", features: ["Interactive digital menu", "Easy real-time updates", "No printing or reprinting costs"], popular: false },
{ price: "149", name: "Ordering Website", features: ["Integrations", "Multi-language support", "Order scheduling", "Branded ordering website"], popular: false },
{ price: "190", name: "App", features: ["Push notifications", "Online payments", "Order tracking", "Order History"], popular: false },
{ price: "200", name: "Kiosk Software", features: ["Increase Sales", "Optimized kiosk UI/UX", "Fast in-store checkout", "Unlimited integrations"], popular: true },
],
statsTitle: "Some Numbers",
stats: [
{ value: "0", suffix: "M", label: "Client Satisfaction" },
{ value: "0", suffix: "h", label: "Expert Support Team" },
{ value: "0", suffix: "k+", label: "Sales Count" },
{ value: "0", suffix: "+", label: "Client Worldwide" },
],
testimonialsTitle: "Hear what our clients say",
testimonialsLead: "Don\u2019t just take our word for it\u2014hear from restaurant owners who have transformed their business with EZorders!",
testimonials: [
{ quote: "Using EZOrders has been a game-changer for our restaurant. Our customers love the convenience of placing orders online, and the seamless integration with our operations has greatly improved our efficiency.", name: "Sarah", role: "Restaurant Owner" },
{ quote: "EZOrders has helped us boost our sales and reach a wider audience. The easy-to-use platform and hassle-free payment options have made ordering a breeze for our customers, resulting in increased revenue for our business.", name: "Mark", role: "Restaurant Manager" },
{ quote: "We have seen a significant increase in customer satisfaction since implementing EZOrders. The ability for our patrons to easily customize their orders and track their delivery has created a more enjoyable dining experience for them, leading to positive reviews and repeat business.", name: "Amanda", role: "Restaurant Operator" },
{ quote: "Thanks to EZOrders, we have saved valuable time and resources. The streamlined order management system has eliminated errors and improved communication with our kitchen staff. Our operations have never been smoother!", name: "David", role: "Restaurant Owner" },
],
};

const he: PricingContent = {
badge: "\u05ea\u05de\u05d7\u05d5\u05e8",
titleAccent: "\u05ea\u05d5\u05db\u05e0\u05d9\u05d5\u05ea",
titleRest: " \u05d5\u05de\u05d7\u05d9\u05e8\u05d9\u05dd",
lead: "\u05d1\u05d9\u05df \u05d0\u05dd \u05e6\u05e8\u05db\u05d9 \u05d4\u05d0\u05d5\u05d8\u05d5\u05de\u05e6\u05d9\u05d4 \u05e9\u05dc\u05db\u05dd \u05d2\u05d3\u05d5\u05dc\u05d9\u05dd \u05d0\u05d5 \u05e7\u05d8\u05e0\u05d9\u05dd \u2014 \u05d0\u05e0\u05d7\u05e0\u05d5 \u05db\u05d0\u05df \u05db\u05d3\u05d9 \u05dc\u05e2\u05d6\u05d5\u05e8 \u05dc\u05db\u05dd \u05dc\u05e6\u05de\u05d5\u05d7.",
monthly: "\u05d7\u05d5\u05d3\u05e9\u05d9",
yearly: "\u05e9\u05e0\u05ea\u05d9",
perMonth: " / \u05dc\u05d7\u05d5\u05d3\u05e9",
mostPopular: "\u05d4\u05db\u05d9 \u05e4\u05d5\u05e4\u05d5\u05dc\u05e8\u05d9",
choosePlan: "\u05d1\u05d7\u05e8\u05d5 \u05d7\u05d1\u05d9\u05dc\u05d4",
plans: [
{ price: "29", name: "\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9", features: ["\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9 \u05d0\u05d9\u05e0\u05d8\u05e8\u05d0\u05e7\u05d8\u05d9\u05d1\u05d9", "\u05e2\u05d3\u05db\u05d5\u05e0\u05d9\u05dd \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea \u05d1\u05e7\u05dc\u05d5\u05ea", "\u05d1\u05dc\u05d9 \u05e2\u05dc\u05d5\u05d9\u05d5\u05ea \u05d4\u05d3\u05e4\u05e1\u05d4 \u05d7\u05d5\u05d6\u05e8\u05ea"], popular: false },
{ price: "149", name: "\u05d0\u05ea\u05e8 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea", features: ["\u05d0\u05d9\u05e0\u05d8\u05d2\u05e8\u05e6\u05d9\u05d5\u05ea", "\u05ea\u05de\u05d9\u05db\u05d4 \u05d1\u05e8\u05d1-\u05dc\u05e9\u05d5\u05e0\u05d9\u05d5\u05ea", "\u05ea\u05d9\u05d6\u05de\u05d5\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea", "\u05d0\u05ea\u05e8 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05de\u05de\u05d5\u05ea\u05d2"], popular: false },
{ price: "190", name: "\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4", features: ["\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea push", "\u05ea\u05e9\u05dc\u05d5\u05de\u05d9\u05dd \u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df", "\u05de\u05e2\u05e7\u05d1 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea", "\u05d4\u05d9\u05e1\u05d8\u05d5\u05e8\u05d9\u05d9\u05ea \u05d4\u05d6\u05de\u05e0\u05d5\u05ea"], popular: false },
{ price: "200", name: "\u05ea\u05d5\u05db\u05e0\u05ea \u05e7\u05d9\u05d5\u05e1\u05e7", features: ["\u05d4\u05d2\u05d3\u05dc\u05ea \u05de\u05db\u05d9\u05e8\u05d5\u05ea", "\u05de\u05de\u05e9\u05e7 \u05e7\u05d9\u05d5\u05e1\u05e7 \u05de\u05d5\u05d8\u05de\u05d1", "\u05ea\u05e9\u05dc\u05d5\u05dd \u05de\u05d4\u05d9\u05e8 \u05d1\u05e2\u05de\u05d3\u05d4", "\u05d0\u05d9\u05e0\u05d8\u05d2\u05e8\u05e6\u05d9\u05d5\u05ea \u05dc\u05dc\u05d0 \u05d4\u05d2\u05d1\u05dc\u05d4"], popular: true },
],
statsTitle: "\u05e7\u05e6\u05ea \u05de\u05e1\u05e4\u05e8\u05d9\u05dd",
stats: [
{ value: "0", suffix: "M", label: "\u05e9\u05d1\u05d9\u05e2\u05d5\u05ea \u05e8\u05e6\u05d5\u05df \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea" },
{ value: "0", suffix: "h", label: "\u05e6\u05d5\u05d5\u05ea \u05ea\u05de\u05d9\u05db\u05d4 \u05de\u05d5\u05de\u05d7\u05d4" },
{ value: "0", suffix: "k+", label: "\u05db\u05de\u05d5\u05ea \u05de\u05db\u05d9\u05e8\u05d5\u05ea" },
{ value: "0", suffix: "+", label: "\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d1\u05db\u05dc \u05d4\u05e2\u05d5\u05dc\u05dd" },
],
testimonialsTitle: "\u05de\u05d4 \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05e9\u05dc\u05e0\u05d5 \u05d0\u05d5\u05de\u05e8\u05d9\u05dd",
testimonialsLead: "\u05d0\u05dc \u05ea\u05e1\u05ea\u05de\u05db\u05d5 \u05e8\u05e7 \u05e2\u05dc \u05d4\u05de\u05d9\u05dc\u05d9\u05dd \u05e9\u05dc\u05e0\u05d5 \u2014 \u05e9\u05de\u05e2\u05d5 \u05de\u05d1\u05e2\u05dc\u05d9 \u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05e9\u05e9\u05d9\u05e0\u05d5 \u05d0\u05ea \u05d4\u05e2\u05e1\u05e7 \u05e9\u05dc\u05d4\u05dd \u05e2\u05dd EZOrders!",
testimonials: [
{ quote: "\u05d4\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1-EZOrders \u05e9\u05d9\u05e0\u05d4 \u05dc\u05e0\u05d5 \u05d0\u05ea \u05d4\u05de\u05e9\u05d7\u05e7 \u05d1\u05de\u05e1\u05e2\u05d3\u05d4. \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d0\u05d5\u05d4\u05d1\u05d9\u05dd \u05d0\u05ea \u05d4\u05e0\u05d5\u05d7\u05d5\u05ea \u05e9\u05d1\u05d4\u05d6\u05de\u05e0\u05d4 \u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df, \u05d5\u05d4\u05d0\u05d9\u05e0\u05d8\u05d2\u05e8\u05e6\u05d9\u05d4 \u05d4\u05d7\u05dc\u05e7\u05d4 \u05e2\u05dd \u05d4\u05ea\u05e4\u05e2\u05d5\u05dc \u05e9\u05dc\u05e0\u05d5 \u05e9\u05d9\u05e4\u05e8\u05d4 \u05de\u05d0\u05d5\u05d3 \u05d0\u05ea \u05d4\u05d9\u05e2\u05d9\u05dc\u05d5\u05ea.", name: "\u05e9\u05e8\u05d4", role: "\u05d1\u05e2\u05dc\u05ea \u05de\u05e1\u05e2\u05d3\u05d4" },
{ quote: "EZOrders \u05e2\u05d6\u05e8\u05d4 \u05dc\u05e0\u05d5 \u05dc\u05d4\u05d2\u05d3\u05d9\u05dc \u05d0\u05ea \u05d4\u05de\u05db\u05d9\u05e8\u05d5\u05ea \u05d5\u05dc\u05d4\u05d2\u05d9\u05e2 \u05dc\u05e7\u05d4\u05dc \u05e8\u05d7\u05d1 \u05d9\u05d5\u05ea\u05e8. \u05d4\u05e4\u05dc\u05d8\u05e4\u05d5\u05e8\u05de\u05d4 \u05d4\u05e0\u05d5\u05d7\u05d4 \u05dc\u05e9\u05d9\u05de\u05d5\u05e9 \u05d5\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05d4\u05ea\u05e9\u05dc\u05d5\u05dd \u05d4\u05e4\u05e9\u05d5\u05d8\u05d5\u05ea \u05d4\u05e4\u05db\u05d5 \u05d0\u05ea \u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05dc\u05e7\u05dc\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea, \u05d5\u05d4\u05d2\u05d3\u05d9\u05dc\u05d5 \u05d0\u05ea \u05d4\u05d4\u05db\u05e0\u05e1\u05d5\u05ea \u05e9\u05dc \u05d4\u05e2\u05e1\u05e7.", name: "\u05de\u05d0\u05d9\u05e8", role: "\u05de\u05e0\u05d4\u05dc \u05de\u05e1\u05e2\u05d3\u05d4" },
{ quote: "\u05e8\u05d0\u05d9\u05e0\u05d5 \u05e2\u05dc\u05d9\u05d9\u05d4 \u05de\u05e9\u05de\u05e2\u05d5\u05ea\u05d9\u05ea \u05d1\u05e9\u05d1\u05d9\u05e2\u05d5\u05ea \u05e8\u05e6\u05d5\u05df \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05de\u05d0\u05d6 \u05e9\u05d4\u05d8\u05de\u05e2\u05e0\u05d5 \u05d0\u05ea EZOrders. \u05d4\u05d9\u05db\u05d5\u05dc\u05ea \u05e9\u05dc \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05dc\u05d4\u05ea\u05d0\u05d9\u05dd \u05d1\u05e7\u05dc\u05d5\u05ea \u05d0\u05ea \u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05d5\u05dc\u05e2\u05e7\u05d5\u05d1 \u05d0\u05d7\u05e8 \u05d4\u05de\u05e9\u05dc\u05d5\u05d7 \u05d9\u05e6\u05e8\u05d4 \u05d7\u05d5\u05d5\u05d9\u05d9\u05ea \u05e1\u05e2\u05d5\u05d3\u05d4 \u05de\u05d4\u05e0\u05d4 \u05d9\u05d5\u05ea\u05e8, \u05e9\u05de\u05d5\u05d1\u05d9\u05dc\u05d4 \u05dc\u05d1\u05d9\u05e7\u05d5\u05e8\u05d5\u05ea \u05d7\u05d9\u05d5\u05d1\u05d9\u05d5\u05ea \u05d5\u05dc\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd.", name: "\u05d0\u05de\u05e0\u05d3\u05d4", role: "\u05de\u05e4\u05e2\u05d9\u05dc\u05ea \u05de\u05e1\u05e2\u05d3\u05d4" },
{ quote: "\u05d1\u05d6\u05db\u05d5\u05ea EZOrders \u05d7\u05e1\u05db\u05e0\u05d5 \u05d6\u05de\u05df \u05d5\u05de\u05e9\u05d0\u05d1\u05d9\u05dd \u05d9\u05e7\u05e8\u05d9\u05dd. \u05de\u05e2\u05e8\u05db\u05ea \u05e0\u05d9\u05d4\u05d5\u05dc \u05d4\u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d4\u05d9\u05e2\u05d9\u05dc\u05d4 \u05d1\u05d9\u05d8\u05dc\u05d4 \u05d8\u05e2\u05d5\u05d9\u05d5\u05ea \u05d5\u05e9\u05d9\u05e4\u05e8\u05d4 \u05d0\u05ea \u05d4\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea \u05e2\u05dd \u05e6\u05d5\u05d5\u05ea \u05d4\u05de\u05d8\u05d1\u05d7. \u05d4\u05ea\u05e4\u05e2\u05d5\u05dc \u05e9\u05dc\u05e0\u05d5 \u05de\u05e2\u05d5\u05dc\u05dd \u05dc\u05d0 \u05d4\u05d9\u05d4 \u05d7\u05dc\u05e7 \u05d9\u05d5\u05ea\u05e8!", name: "\u05d3\u05d5\u05d3", role: "\u05d1\u05e2\u05dc \u05de\u05e1\u05e2\u05d3\u05d4" },
],
};

const map: Record<Locale, PricingContent> = { en, he };

export function getPricingContent(locale: Locale = "en"): PricingContent {
return map[locale] ?? en;
}
