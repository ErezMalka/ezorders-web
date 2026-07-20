import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { kioskStandsContent } from "@/data/products/kiosk-stands";

export const metadata: Metadata = {
  title: "עמדות קיוסק - ezorders",
  description: "עמדת קיוסק למסעדה בשירות עצמי שהופכת עומסי שעות שיא להזמנות מהירות, מדויקות ובעלות סל גבוה — ומפנה זמן לצוות.",
  alternates: { languages: { en: "/kiosk-stands", he: "/he/kiosk-stands", "x-default": "/kiosk-stands" } },
};

export default function HeKioskStandsPage() {
  return <ProductPageLayout content={kioskStandsContent.he} locale="he" />;
}
