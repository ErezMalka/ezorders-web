import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { orderingAppContent } from "@/data/products/restaurant-ordering-app";

export const metadata: Metadata = {
  title: "אפליקציית הזמנות למסעדה - ezorders",
  description: "אפליקציית הזמנות למסעדה שמנהלת הזמנות אונליין, מגבירה נאמנות לקוחות ומגדילה מכירות — עם התראות פוש, מעקב הזמנות ותשלום מאובטח.",
  alternates: { languages: { en: "/restaurant-ordering-app", he: "/he/restaurant-ordering-app", "x-default": "/restaurant-ordering-app" } },
};

export default function HeOrderingAppPage() {
  return <ProductPageLayout content={orderingAppContent.he} locale="he" />;
}
