import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { kioskStandsContent } from "@/data/products/kiosk-stands";

export const metadata: Metadata = {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/kiosk-stands",
      he: "/he/kiosk-stands",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he/kiosk-stands",
    },
  },
  title: "Kiosk stands - ezorders",
  description:
    "A modern self-service restaurant kiosk that turns rush-hour bottlenecks into fast, accurate, high-conversion orders.",
};

export default function KioskStandsPage() {
  return <ProductPageLayout content={kioskStandsContent.en}  path="/kiosk-stands" />;
}