"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import { SIGNUP_URL } from "@/data/content";
import { getDictionary } from "@/i18n/getDictionary";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { CTAButton } from "./CTAButton";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ dictionary }: { dictionary?: Dictionary }) {
      const [open, setOpen] = useState(false);

  const dict = dictionary ?? getDictionary("en");
      const navItems = dict.nav;
      const ctaLabel = dict.header.cta;

  const desktopNav = createElement(
          "nav",
      { className: "hidden items-center gap-8 font-medium md:flex" },
          navItems.map((entry) =>
                    entry.items
                               ? createElement(
                                               "div",
                                   { key: entry.label, className: "group relative" },
                                               createElement(
                                                                 Link,
                                                   { href: entry.href, className: "flex items-center gap-1" },
                                                                 entry.label,
                                                                 createElement("span", { className: "text-xs" }, "\u25be")
                                                               ),
                                               createElement(
                                                                 "div",
                                                   {
                                                                       className:
                                                                                             "invisible absolute left-0 top-full w-64 rounded-card bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100",
                                                   },
                                                                 entry.items.map((i) =>
                                                                                     createElement(
                                                                                                           Link,
                                                                                         {
                                                                                                                 key: i.href,
                                                                                                                 href: i.href,
                                                                                                                 className: "block rounded-lg px-4 py-2 hover:bg-brand-grey",
                                                                                             },
                                                                                                           i.label
                                                                                                         )
                                                                                               )
                                                               )
                                             )
                      : createElement(Link, { key: entry.label, href: entry.href }, entry.label)
                           )
        );

  const mobileNav =
          open &&
          createElement(
                    "div",
              { className: "mx-4 rounded-card bg-white p-4 shadow-lg md:hidden" },
                    createElement(
                                "nav",
                        { className: "flex flex-col gap-2 font-medium" },
                                navItems.map((entry) =>
                                              createElement(
                                                              "div",
                                                  { key: entry.label },
                                                              createElement(
                                                                                Link,
                                                                  {
                                                                                      href: entry.href,
                                                                                      className: "block py-2",
                                                                                      onClick: () => setOpen(false),
                                                                  },
                                                                                entry.label
                                                                              ),
                                                              entry.items
                                                                ? entry.items.map((i) =>
                                                                                      createElement(
                                                                                                              Link,
                                                                                          {
                                                                                                                    key: i.href,
                                                                                                                    href: i.href,
                                                                                                                    className: "block py-1 pl-4 text-sm text-brand-muted",
                                                                                                                    onClick: () => setOpen(false),
                                                                                              },
                                                                                                              i.label
                                                                                                            )
                                                                                                  )
                                                                : null
                                                            )
                                                     ),
                                createElement(LanguageSwitcher, {
                                              className: "mt-2 border-t border-gray-100 pt-3",
                                }),
                                createElement(CTAButton, { href: SIGNUP_URL, className: "mt-2" }, ctaLabel)
                              )
                  );

  return createElement(
          "header",
      { className: "absolute top-0 left-0 z-50 w-full" },
          createElement(
                    "div",
              {
                          className:
                                        "mx-auto flex max-w-container items-center justify-between px-6 py-6",
              },
                    createElement(Logo, { href: dict.nav[0].href }),
                    desktopNav,
                    createElement(
                                "div",
                        { className: "hidden md:flex items-center gap-6" },
                                createElement(LanguageSwitcher, null),
                                createElement(CTAButton, { href: SIGNUP_URL }, ctaLabel)
                              ),
                    createElement(
                                "button",
                        {
                                      className: "text-2xl md:hidden",
                                      onClick: () => setOpen(!open),
                                      "aria-label": "Toggle menu",
                        },
                                "\u2630"
                              )
                  ),
          mobileNav
        );
}
