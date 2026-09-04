import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { TermsOfUse } from "@/components/TermsOfUse";

export const metadata: Metadata = {
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
};

export default function TermsPage() {
  return (
    <PageLayout locale="he">
      <TermsOfUse locale="he" />
    </PageLayout>
  );
}
