import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { AccessibilityStatement } from "@/components/AccessibilityStatement";

export const metadata: Metadata = {
  title: "Accessibility statement - EZOrders",
  description:
    "What EZOrders has done to make this website accessible, what the accessibility menu offers, and whom to contact if something is in your way.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/accessibility",
      he: "/he/accessibility",
      "x-default": "/he/accessibility",
    },
  },
};

export default function EnAccessibilityPage() {
  return (
    <PageLayout>
      <AccessibilityStatement locale="en" />
    </PageLayout>
  );
}
