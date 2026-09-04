import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { AccessibilityStatement } from "@/components/AccessibilityStatement";

export const metadata: Metadata = {
  title: "הצהרת נגישות - EZOrders",
  description:
    "מה נעשה כדי שהאתר של EZOrders יהיה נגיש לאנשים עם מוגבלות, אילו התאמות זמינות בתפריט הנגישות, ואל מי לפנות אם נתקלתם בבעיה.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/accessibility",
      he: "/he/accessibility",
      "x-default": "/he/accessibility",
    },
  },
};

export default function HeAccessibilityPage() {
  return (
    <PageLayout locale="he">
      <AccessibilityStatement locale="he" />
    </PageLayout>
  );
}
