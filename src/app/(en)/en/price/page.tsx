import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { PriceTabs } from "@/components/PriceTabs";
import { PricingCalculator } from "@/components/PricingCalculator";
import { loadHardwareShowcase, loadPublicCatalogue } from "@/lib/agent/products";
import { ContactBand } from "@/components/sections/ContactBand";
import { softwareApplicationSchema } from "@/lib/seo/product-schema";

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
  title: "Pricing — Restaurant System Cost Calculator | EZOrders",
  description:
    "Build your EZOrders package and see the price live: POS, ordering website, kiosk, loyalty and integrations, in shekels, with a monthly discount of up to 40%.",
};

/**
 * Same calculator, same catalogue, same engine as /he/price — the English page
 * used to show a four-plan table in US dollars that no customer was ever
 * charged. Revalidated once a minute for the same reason as the Hebrew page:
 * the catalogue lives in the database, and this page must stay cacheable.
 */
export const revalidate = 60;

export default async function PricePage() {
  const [catalogue, hardware] = await Promise.all([loadPublicCatalogue(), loadHardwareShowcase()]);

  return (
    <PageLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema("en")) }}
      />
      <div className="pt-28">
        <PriceTabs hardware={hardware} locale="en">
          <PricingCalculator catalogue={catalogue} locale="en" />
        </PriceTabs>
      </div>
      <ContactBand />
    </PageLayout>
  );
}
