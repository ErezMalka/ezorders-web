import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { LandingPage } from "@/components/landing/LandingPage";
import { foodtruckLanding } from "@/data/landingPages";

// Paid-traffic landing page for the mobile-food angle (Google ad group
// "עסק מזון נייד" + the Meta campaign of the same name). noindex — it exists
// for bought traffic, not for organic.
export const metadata: Metadata = pageMetadata("/he/lp/foodtruck", {
  title: "קופה ומערכת הזמנות לפודטראק ולעגלת קפה | EZOrders",
  description:
    "מערכת הזמנות, קופה ותשלום לעסק מזון נייד — פודטראק, עגלת קפה או דוכן. עובדת מטאבלט או נייד, בלי התקנה מסובכת.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/he/lp/foodtruck" },
});

export default function FoodtruckLandingPage() {
  return <LandingPage content={foodtruckLanding} />;
}
