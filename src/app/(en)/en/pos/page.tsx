import type { Metadata } from "next";
import { pageMetadata } from "@/app/_shared/locale-metadata";
import { PosPage } from "@/components/PosPage";
import { getPosContent } from "@/data/posContent";

const t = getPosContent("en");

export const metadata: Metadata = pageMetadata("/en/pos", {
  title: t.meta.title,
  description: t.meta.description,
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/pos",
      he: "/he/pos",
      "x-default": "/he/pos",
    },
  },
});

export default function PosRoute() {
  return <PosPage locale="en" />;
}
