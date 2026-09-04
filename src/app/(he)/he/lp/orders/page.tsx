import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { ordersLanding } from "@/data/landingPages";

// Paid-traffic landing page — noindex so it never competes in organic search
// with /he/restaurant-ordering-website and /he/restaurant-ordering-app.
export const metadata: Metadata = {
  title: "אתר ואפליקציית הזמנות ללא עמלות | EZOrders",
  description:
    "ערוץ הזמנות משלכם — אתר, אפליקציה וקיוסק עם המותג שלכם, שמזרימים ישירות לקופה. בלי עמלה על כל הזמנה.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/he/lp/orders" },
};

export default function OrdersLandingPage() {
  return <LandingPage content={ordersLanding} />;
}
