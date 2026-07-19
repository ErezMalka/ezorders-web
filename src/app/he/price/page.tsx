import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { PricingCalculator } from "@/components/PricingCalculator";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";

export const metadata: Metadata = {
  title: "מחירון ומחשבון מחירים - ezorders",
  description:
    "\u05ea\u05de\u05d7\u05d5\u05e8 \u05e4\u05e9\u05d5\u05d8 \u05d5\u05e9\u05e7\u05d5\u05e3 ל-EZOrders. \u05d1\u05d7\u05e8\u05d5 \u05d0\u05ea \u05d4\u05d7\u05d1\u05d9\u05dc\u05d4 \u05e9\u05de\u05ea\u05d0\u05d9\u05de\u05d4 \u05dc\u05de\u05e1\u05e2\u05d3\u05d4 \u05e9\u05dc\u05db\u05dd \u05d5\u05d4\u05ea\u05d7\u05d9\u05dc\u05d5 \u05d1\u05d4\u05ea\u05e0\u05e1\u05d5\u05ea \u05d7\u05d9\u05e0\u05dd \u05dc-14 \u05d9\u05d5\u05dd, \u05dc\u05dc\u05d0 \u05db\u05e8\u05d8\u05d9\u05e1 \u05d0\u05e9\u05e8\u05d0\u05d9.",
  alternates: {
    languages: {
      en: "/price",
      he: "/he/price",
      "x-default": "/price",
    },
  },
};

export default function HePricePage() {
  return (
    <PageLayout locale="he">
    <div className="pt-28">
    <PricingCalculator />
    </div>
    <StatsStrip locale="he" />
    <Testimonials locale="he" />
    <ContactBand locale="he" />
    </PageLayout>
    );
}
