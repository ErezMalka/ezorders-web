import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { getDictionary } from "@/i18n/getDictionary";

const dict = getDictionary("he");

export const metadata: Metadata = {
      title: dict.meta.home.title,
      description: dict.meta.home.description,
      alternates: {
            languages: {
                  en: "/",
                  he: "/he",
                  "x-default": "/",
            },
      },
};

export default function HeHomePage() {
      const content = createElement(
            "section",
            {
                  style: {
                        padding: "8rem 1.5rem 4rem",
                        maxWidth: "48rem",
                        margin: "0 auto",
                  },
            },
            createElement(
                  "h1",
                  { style: { fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" } },
                  dict.meta.home.title
                  ),
            createElement(
                  "p",
                  { style: { color: "#555", lineHeight: 1.7 } },
                  dict.meta.home.description
                  )
            );

return createElement(PageLayout, { locale: "he", children: content });
}
