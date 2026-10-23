import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { PageLayout } from "@/components/PageLayout";
import { TermsOfUse } from "@/components/TermsOfUse";

export const metadata: Metadata = pageMetadata("/he/terms", {
  title: "תנאי שימוש - EZOrders",
  description: "תנאי השימוש באתר ezorders.com: מהות האתר, מחשבונים והערכות מחיר, קניין רוחני, אחריות ודין.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/terms",
      he: "/he/terms",
      "x-default": "/he/terms",
    },
  },
});

export default function TermsPage() {
  return (
    <PageLayout locale="he">
      <TermsOfUse locale="he" />
    </PageLayout>
  );
}
