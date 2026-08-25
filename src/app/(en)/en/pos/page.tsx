import type { Metadata } from "next";
import { PosPage } from "@/components/PosPage";
import { getPosContent } from "@/data/posContent";

const t = getPosContent("en");

export const metadata: Metadata = {
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
};

export default function PosRoute() {
  return <PosPage locale="en" />;
}
