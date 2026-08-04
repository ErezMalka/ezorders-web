import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy - ezorders",
  description:
    "How EZOrders collects, uses, and protects the information you share through our website.",
  alternates: {
    languages: {
      en: "/en/privacy",
      he: "/he/privacy",
      "x-default": "/he/privacy",
    },
  },
};

export default function PrivacyPage() {
  return createElement(PageLayout, { locale: "en" }, createElement(PrivacyPolicy, { locale: "en" }));
}
