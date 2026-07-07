import type { Metadata } from "next";
import { createElement } from "react";
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
    return createElement(
          "main",
      { style: { padding: "4rem 1.5rem", maxWidth: "48rem", margin: "0 auto" } },
          createElement(
                  "h1",
            { style: { fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" } },
                  dict.meta.home.title
                ),
          createElement(
                  "p",
            { style: { color: "#555", lineHeight: 1.7 } },
                  dict.meta.home.description
                )
        );
}
