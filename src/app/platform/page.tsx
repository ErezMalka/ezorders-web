import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";
import { getPlatformContent } from "@/data/platformContent";

const t = getPlatformContent("en");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  alternates: {
    languages: {
      en: "/platform",
      he: "/he/platform",
      "x-default": "/platform",
    },
  },
};

export default function PlatformRoute() {
  return <PlatformPage locale="en" />;
}
