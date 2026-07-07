import { createElement } from "react";
import { localeDirection } from "@/i18n/config";

export default function HeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return createElement(
          "div",
      { lang: "he", dir: localeDirection.he },
          children
        );
}
