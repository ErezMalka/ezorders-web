import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { digitalMenusContent } from "@/data/products/digital-menus";

export const metadata: Metadata = pageMetadata("/en/digital-menus", {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/digital-menus",
      he: "/he/digital-menus",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he/digital-menus",
    },
  },
  title: "Digital Menu for Restaurants — QR & Allergens | EZOrders",
  description:
    "Modernize your menu experience with a responsive digital menu for restaurants — real-time edits, built-in upsells, and one-tap order links.",
});

export default function DigitalMenusPage() {
  return <ProductPageLayout content={digitalMenusContent.en}  path="/digital-menus" />;
}