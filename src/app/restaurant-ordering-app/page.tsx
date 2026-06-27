import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { orderingAppContent } from "@/data/products/restaurant-ordering-app";

export const metadata: Metadata = {
  title: "Restaurant ordering app - ezorders",
  description:
    "Revolutionize your restaurant with a user-friendly ordering app — manage online orders, track inventory, and gain business insights.",
};

export default function RestaurantOrderingAppPage() {
  return <ProductPageLayout content={orderingAppContent} />;
}