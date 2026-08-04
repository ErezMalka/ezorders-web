import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { PricingTable } from "@/components/sections/PricingTable";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";

export const metadata: Metadata = {
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