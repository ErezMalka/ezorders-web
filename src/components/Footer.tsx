import Link from "next/link";
import { createElement } from "react";
import { Logo } from "./Logo";
import { CookieSettingsLink } from "./CookieBanner";
import { getDictionary } from "@/i18n/getDictionary";
import type { Dictionary } from "@/i18n/dictionaries/en";

type FooterLink = { label: string; href: string };

export function Footer({ dictionary, locale = "en" }: { dictionary?: Dictionary; locale?: "en" | "he" }) {
      const f = (dictionary ?? getDictionary("en")).footer;

  return createElement(
          "footer",
      { className: "border-t border-gray-100 bg-white" },
          createElement(
                    "div",
              {
                          // Five columns once a locale supplies the tools list,
                          // four when it does not — English has no Hebrew-only
                          // calculators to show.
                          className: `mx-auto grid max-w-container gap-10 px-6 py-14 ${
                            f.tools?.length ? "md:grid-cols-5" : "md:grid-cols-4"
                          }`,
              },
                    createElement(Logo, { href: f.learnMore[0].href }),
                    FooterCol({ title: f.learnMoreTitle, links: f.learnMore }),
                    FooterCol({ title: f.solutionsTitle, links: f.solutions }),
                    f.tools?.length && f.toolsTitle
                      ? FooterCol({ title: f.toolsTitle, links: f.tools })
                      : null,
                    createElement(
                                "div",
                                null,
                                createElement("h2", { className: "mb-4 font-semibold" }, f.contactTitle),
                                createElement("p", { className: "text-brand-muted" }, f.tel)
                              )
                  ),
          createElement(
                    "div",
              {
                          className:
                                        "border-t border-gray-100 py-6 text-center text-sm text-brand-muted",
              },
                    createElement("span", null, f.rights),
                    createElement("span", { className: "mx-2 text-gray-500", "aria-hidden": true }, "·"),
                    // The agents' way back in. Deliberately plain and last: it is a
                    // staff door on a customer-facing page, so it should be findable
                    // by the five people who need it and invisible to everyone else.
                    createElement(
                                Link,
                          { href: f.agentPortal.href, className: "hover:text-brand-dark" },
                                f.agentPortal.label
                              ),
                    createElement("span", { className: "mx-2 text-gray-500", "aria-hidden": true }, "·"),
                    // Reopens the consent banner — the "change your mind" the
                    // privacy regulator asks for, findable on every page.
                    createElement(CookieSettingsLink, { locale, className: "hover:text-brand-dark" })
                  )
        );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
      return createElement(
              "div",
              null,
              createElement("h2", { className: "mb-4 font-semibold" }, title),
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
