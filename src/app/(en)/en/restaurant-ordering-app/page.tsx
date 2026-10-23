import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { orderingAppContent } from "@/data/products/restaurant-ordering-app";

export const metadata: Metadata = pageMetadata("/en/restaurant-ordering-app", {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/restaurant-ordering-app",
      he: "/he/restaurant-ordering-app",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he/restaurant-ordering-app",
    },
  },
  title: "Restaurant Ordering App — Branded, With Loyalty | EZOrders",
  description:
    "Revolutionize your restaurant with a user-friendly ordering app — manage online orders, track inventory, and gain business insights.",
});

export default function RestaurantOrderingAppPage() {
  return <ProductPageLayout content={orderingAppContent.en}  path="/restaurant-ordering-app" />;
}