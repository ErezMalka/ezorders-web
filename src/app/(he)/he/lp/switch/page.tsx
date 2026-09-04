import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { switchLanding } from "@/data/landingPages";

// Paid-traffic landing page for the competitor ad group. noindex — it speaks to
// people who arrived from a comparison search, not to organic visitors.
export const metadata: Metadata = {
  title: "מחליפים מערכת למסעדה? בדיקת התאמה | EZOrders",
  description:
    "כבר יש לכם קופה או מערכת הזמנות ואתם בודקים חלופה? נעשה השוואה כנה ונגיד לכם גם אם לא כדאי להחליף.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/he/lp/switch" },
};

export default function SwitchLandingPage() {
  return <LandingPage content={switchLanding} />;
}
