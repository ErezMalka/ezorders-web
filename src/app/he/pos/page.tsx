import type { Metadata } from "next";
import { PosPage } from "@/components/PosPage";
import { getPosContent } from "@/data/posContent";

const t = getPosContent("he");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  alternates: {
    languages: {
      en: "/pos",
      he: "/he/pos",
      "x-default": "/pos",
    },
  },
};

export default function HePosRoute() {
  return <PosPage locale="he" />;
}
