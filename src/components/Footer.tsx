import Link from "next/link";
import { createElement } from "react";
import { Logo } from "./Logo";
import {
    footerLearnMore as defaultLearnMore,
    footerSolutions as defaultSolutions,
} from "@/data/content";
import type { Dictionary } from "@/i18n/dictionaries/en";

type FooterLink = { label: string; href: string };

const DEFAULTS = {
    learnMoreTitle: "Learn More",
    solutionsTitle: "Solutions",
    contactTitle: "Contact Us",
    tel: "Tel: 123-456-7890",
    rights: "\u00a9 2025 EZOrders | All Rights Reserved",
};

export function Footer({ dictionary }: { dictionary?: Dictionary }) {
    const f = dictionary?.footer;
    const learnMore: FooterLink[] = f?.learnMore ?? defaultLearnMore;
    const solutions: FooterLink[] = f?.solutions ?? defaultSolutions;
    const learnMoreTitle = f?.learnMoreTitle ?? DEFAULTS.learnMoreTitle;
    const solutionsTitle = f?.solutionsTitle ?? DEFAULTS.solutionsTitle;
    const contactTitle = f?.contactTitle ?? DEFAULTS.contactTitle;
    const tel = f?.tel ?? DEFAULTS.tel;
    const rights = f?.rights ?? DEFAULTS.rights;

  return createElement(
        "footer",
    { className: "border-t border-gray-100 bg-white" },
        createElement(
                "div",
          {
                    className:
                                "mx-auto grid max-w-container gap-10 px-6 py-14 md:grid-cols-4",
          },
                createElement(Logo, null),
                FooterCol({ title: learnMoreTitle, links: learnMore }),
                FooterCol({ title: solutionsTitle, links: solutions }),
                createElement(
                          "div",
                          null,
                          createElement("h4", { className: "mb-4 font-semibold" }, contactTitle),
                          createElement("p", { className: "text-brand-muted" }, tel)
                        )
              ),
        createElement(
                "div",
          {
                    className:
                                "border-t border-gray-100 py-6 text-center text-sm text-brand-muted",
          },
                rights
              )
      );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
    return createElement(
          "div",
      { key: title },
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
