import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { digitalMenusContent } from "@/data/products/digital-menus";

export const metadata: Metadata = {
  title: "Digital Menus - ezorders",
  description:
    "Modernize your menu experience with a responsive digital menu for restaurants — real-time edits, built-in upsells, and one-tap order links.",
};

export default function DigitalMenusPage() {
  return <ProductPageLayout content={digitalMenusContent} />;
}