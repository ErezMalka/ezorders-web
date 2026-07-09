import Link from "next/link";
import { createElement } from "react";
import { Logo } from "./Logo";
import { getDictionary } from "@/i18n/getDictionary";
import type { Dictionary } from "@/i18n/dictionaries/en";

type FooterLink = { label: string; href: string };

export function Footer({ dictionary }: { dictionary?: Dictionary }) {
      const f = (dictionary ?? getDictionary("en")).footer;

  return createElement(
          "footer",
      { className: "border-t border-gray-100 bg-white" },
          createElement(
                    "div",
              {
                          className:
                                        "mx-auto grid max-w-container gap-10 px-6 py-14 md:grid-cols-4",
              },
                    createElement(Logo, { href: f.learnMore[0].href }),
                    FooterCol({ title: f.learnMoreTitle, links: f.learnMore }),
                    FooterCol({ title: f.solutionsTitle, links: f.solutions }),
                    createElement(
                                "div",
                                null,
                                createElement("h4", { className: "mb-4 font-semibold" }, f.contactTitle),
                                createElement("p", { className: "text-brand-muted" }, f.tel)
                              )
                  ),
          createElement(
                    "div",
              {
                          className:
                                        "border-t border-gray-100 py-6 text-center text-sm text-brand-muted",
              },
                    f.rights
                  )
        );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
      return createElement(
              "div",
              null,
              createElement("h4", { className: "mb-4 font-semibold" }, title),
              createElement(
                        "ul",
                  { className: "space-y-2 text-brand-muted" },
                        links.map((l) =>
                                    createElement(
                                                  "li",
                                        { key: l.href },
                                                  createElement(
                                                                  Link,
                                                      { href: l.href, className: "hover:text-brand-dark" },
                                                                  l.label
                                                                )
                                                )
                                        )
                      )
            );
}
