import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { orderingWebsiteContent } from "@/data/products/restaurant-ordering-website";

export const metadata: Metadata = {
  title: "Restaurant ordering website - ezorders",
  description:
    "A user-friendly restaurant ordering website to customize orders, make secure payments, and unlock your restaurant’s potential.",
};

export default function RestaurantOrderingWebsitePage() {
  return <ProductPageLayout content={orderingWebsiteContent} />;
}