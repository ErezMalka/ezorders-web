import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { PricingTable } from "@/components/sections/PricingTable";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";

export const metadata: Metadata = {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/price",
      he: "/he/price",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he/price",
    },
  },
  title: "Price - ezorders",
  description:
    "Plans & Pricing — whether your time-saving automation needs are large or small, EZOrders is here to help you scale.",
};

export default function PricePage() {
  return (
    <PageLayout>
      <div className="pt-28">
        <PricingTable />
      </div>
      <StatsStrip />
      <Testimonials />
      <ContactBand />
    </PageLayout>
  );
}