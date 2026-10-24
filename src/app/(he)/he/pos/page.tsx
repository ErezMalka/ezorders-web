import type { Metadata } from "next";
import { PosPage } from "@/components/PosPage";
import { getPosContent } from "@/data/posContent";
import { autoFaq } from "@/data/faq-auto";

const t = getPosContent("he");

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

export default function HePosRoute() {
  return <PosPage locale="he" extraFaq={autoFaq("/he/pos")} />;
}
