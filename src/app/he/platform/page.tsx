import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";
import { getPlatformContent } from "@/data/platformContent";

const t = getPlatformContent("he");

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

export default function HePlatformRoute() {
  return <PlatformPage locale="he" />;
}
