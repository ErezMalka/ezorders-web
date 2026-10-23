import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { LandingPage } from "@/components/landing/LandingPage";
import { posLanding } from "@/data/landingPages";

// Paid-traffic landing page — noindex so it never competes in organic search
// with /he/pos, which targets the same terms.
export const metadata: Metadata = pageMetadata("/he/lp/pos", {
  title: "קופה חכמה למזון מהיר | EZOrders",
  description:
    "קופה אחת שמחברת דלפק, אתר הזמנות, אפליקציה וקיוסק — תפריט אחד, דוח אחד. מ-₪350 לחודש, קבלו הצעת מחיר.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/he/lp/pos" },
});

export default function PosLandingPage() {
  return <LandingPage content={posLanding} />;
}
