import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { posLanding } from "@/data/landingPages";

// Paid-traffic landing page — noindex so it never competes in organic search
// with /he/pos, which targets the same terms.
export const metadata: Metadata = {
  title: "קופה חכמה למזון מהיר | EZOrders",
  description:
    "קופה אחת שמחברת דלפק, אתר הזמנות, אפליקציה וקיוסק — תפריט אחד, דוח אחד. קבעו דמו קצר על התפריט שלכם.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/he/lp/pos" },
};

export default function PosLandingPage() {
  return <LandingPage content={posLanding} />;
}
