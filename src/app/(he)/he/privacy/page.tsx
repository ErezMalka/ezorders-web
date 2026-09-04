import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";

export const metadata: Metadata = {
  title: "מדיניות פרטיות - ezorders",
  description:
    "כיצד EZOrders אוספת, משתמשת ומגנה על המידע שאתם משתפים דרך האתר שלנו.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/privacy",
      he: "/he/privacy",
      "x-default": "/he/privacy",
    },
  },
};

export default function HePrivacyPage() {
  return createElement(PageLayout, { locale: "he" }, createElement(PrivacyPolicy, { locale: "he" }));
}
