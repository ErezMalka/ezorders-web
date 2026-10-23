import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { PlatformPage } from "@/components/PlatformPage";
import { getPlatformContent } from "@/data/platformContent";

const t = getPlatformContent("en");

export const metadata: Metadata = pageMetadata("/en/platform", {
  title: t.meta.title,
  description: t.meta.description,
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/platform",
      he: "/he/platform",
      "x-default": "/he/platform",
    },
  },
});

export default function PlatformRoute() {
  return <PlatformPage locale="en" />;
}
