import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { orderingWebsiteContent } from "@/data/products/restaurant-ordering-website";

export const metadata: Metadata = {
  title: "אתר הזמנות למסעדה - ezorders",
  description: "אתר הזמנות אונליין למסעדה שלכם — חוויית הזמנה חלקה, תשלום מאובטח, אפסייל חכם ומערכת ניהול לקוחות שמגדילה מכירות.",
  alternates: { languages: { en: "/restaurant-ordering-website", he: "/he/restaurant-ordering-website", "x-default": "/restaurant-ordering-website" } },
};

export default function HeOrderingWebsitePage() {
  return <ProductPageLayout content={orderingWebsiteContent.he} locale="he" />;
}
