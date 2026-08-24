"use client";

import { createElement, Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { CTAButton } from "./CTAButton";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ dictionary, locale = "en" }: { dictionary?: Dictionary; locale?: "en" | "he" }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dict = dictionary ?? getDictionary("en");
  const isHe = locale === "he";
  const navItems = dict.nav;
  const ctaLabel = dict.header.cta;

  const close = () => setOpen(false);

  // The header is pinned, so it has to paint a background once anything scrolls
  // under it — over the hero it stays transparent, as before.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll and allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
              createElement("span", { className: "text-xs" }, "▾")
            ),
            createElement(
              "div",
              {
                className:
                  "invisible absolute start-0 top-full w-64 rounded-card bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100",
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

  // --- Mobile slide-in drawer ---
  const drawerFromRight = true; // hamburger sits on the right in both LTR and RTL

  const overlay = createElement("div", {
    onClick: close,
    "aria-hidden": true,
    className: "fixed inset-0 z-50 bg-brand-dark/50 backdrop-blur-sm md:hidden",
    style: {
      opacity: open ? 1 : 0,
      pointerEvents: open ? "auto" : "none",
      transition: "opacity 300ms ease",
    },
  });

  const drawerHeader = createElement(
    "div",
    { className: "mb-6 flex items-center justify-between" },
    createElement(Logo, { href: dict.nav[0].href }),
    createElement(
      "button",
      {
        onClick: close,
        "aria-label": "Close menu",
        className:
          "flex h-11 w-11 items-center justify-center rounded-full text-2xl text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark",
      },
      "✕"
    )
  );

  const drawerNav = createElement(
    "nav",
    { className: "flex flex-1 flex-col gap-1 overflow-y-auto font-medium" },
    navItems.map((entry) =>
      createElement(
        "div",
        { key: entry.label, className: "border-b border-gray-100 py-1" },
        createElement(
          Link,
          {
            href: entry.href,
            className: "flex min-h-11 items-center rounded-lg px-2 text-brand-dark transition-colors hover:bg-brand-tint hover:text-brand-pink",
            onClick: close,
          },
          entry.label
        ),
        entry.items
          ? createElement(
              "div",
              { className: "flex flex-col" },
              entry.items.map((i) =>
                createElement(
                  Link,
                  {
                    key: i.href,
                    href: i.href,
                    className:
                      "flex min-h-10 items-center rounded-lg px-2 ps-5 text-sm text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark",
                    onClick: close,
                  },
                  i.label
                )
              )
            )
          : null
      )
    )
  );

  const drawerFooter = createElement(
    "div",
    { className: "mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5" },
    createElement(LanguageSwitcher, null),
    createElement(CTAButton, { href: dict.header.ctaHref, className: "w-full text-center" }, ctaLabel)
  );

  const closedTransform = drawerFromRight ? "translateX(100%)" : "translateX(-100%)";
  const drawerPanel = createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": true,
      "aria-hidden": !open,
      className: `fixed top-0 z-[60] flex h-full w-[300px] max-w-[85%] flex-col bg-white p-6 shadow-2xl md:hidden ${
        drawerFromRight ? "right-0" : "left-0"
      }`,
      style: {
        transform: open ? "translateX(0)" : closedTransform,
        // A translated-away panel is still focusable and still read by screen
        // readers. `visibility: hidden` removes it from both, and is delayed by
        // the slide duration so the closing animation still plays.
        visibility: open ? "visible" : "hidden",
        transition: open
          ? "transform 300ms ease-out, visibility 0s"
          : "transform 300ms ease-out, visibility 0s linear 300ms",
      },
    },
    drawerHeader,
    drawerNav,
    drawerFooter
  );

  const mobileDrawer = createElement(Fragment, null, overlay, drawerPanel);

  return createElement(
    Fragment,
    null,
    createElement(
      "header",
      {
        // Pinned on every breakpoint. It was already out of flow (`absolute`),
        // so pages that pad for it (pt-28 / pt-36) need no change.
        // inset-x-0 rather than left-0: direction-agnostic under dir="rtl".
        className: `fixed inset-x-0 top-0 z-40 w-full transition-[background-color,box-shadow] duration-200 ${
          scrolled ? "bg-white/90 shadow-sm backdrop-blur-md" : "bg-transparent"
        }`,
      },
      createElement(
        "div",
        { className: "mx-auto flex max-w-container items-center justify-between px-6 py-6" },
        createElement(Logo, { href: dict.nav[0].href }),
        desktopNav,
        createElement(
          "div",
          { className: "hidden md:flex items-center gap-6" },
          createElement(LanguageSwitcher, null),
          createElement(CTAButton, { href: dict.header.ctaHref }, ctaLabel)
        ),
        createElement(
          "button",
          {
            // 44x44 hit area (Apple/Google minimum); the negative inline margin
            // keeps the glyph optically aligned with the container padding.
            className: isHe
              ? "order-first -ms-2.5 flex h-11 w-11 items-center justify-center text-2xl md:order-none md:hidden"
              : "-me-2.5 flex h-11 w-11 items-center justify-center text-2xl md:hidden",
            onClick: () => setOpen(true),
            "aria-label": "Open menu",
            "aria-expanded": open,
          },
          "☰"
        )
      )
    ),
    mobileDrawer
  );
}
