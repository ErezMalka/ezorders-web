import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { TermsOfUse } from "@/components/TermsOfUse";

export const metadata: Metadata = {
  title: "Terms of use - EZOrders",
  description: "Terms of use for ezorders.com: what the site is, calculators and estimates, intellectual property, liability and governing law.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/terms",
      he: "/he/terms",
      "x-default": "/he/terms",
    },
  },
};

export default function TermsPage() {
  return (
    <PageLayout>
      <TermsOfUse locale="en" />
    </PageLayout>
  );
}
