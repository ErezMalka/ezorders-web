import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { kioskStandsContent } from "@/data/products/kiosk-stands";

export const metadata: Metadata = {
  title: "Kiosk stands - ezorders",
  description:
    "A modern self-service restaurant kiosk that turns rush-hour bottlenecks into fast, accurate, high-conversion orders.",
};

export default function KioskStandsPage() {
  return <ProductPageLayout content={kioskStandsContent} />;
}