"use client";

import { createElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = {
    en: "EN",
    he: "עב",
};

/**
 * Returns the route path with any locale prefix removed.
 * "/he/about" -> "/about", "/he" -> "/", "/about" -> "/about", "/" -> "/"
 */
function stripLocale(pathname: string): string {
    if (pathname === "/he") return "/";
    if (pathname.startsWith("/he/")) return pathname.slice(3);
    return pathname;
}

/**
 * Builds the href for a given target locale, preserving the current route.
 * en -> bare root path, he -> "/he" prefixed path.
 */
function buildHref(basePath: string, target: Locale): string {
    if (target === "en") return basePath;
    return basePath === "/" ? "/he" : "/he" + basePath;
}

function currentLocale(pathname: string): Locale {
    return pathname === "/he" || pathname.startsWith("/he/") ? "he" : "en";
}

export function LanguageSwitcher({ className }: { className?: string }) {
    const pathname = usePathname() || "/";
    const active = currentLocale(pathname);
    const basePath = stripLocale(pathname);

  const links = (["en", "he"] as Locale[]).map((locale) =>
        createElement(
                Link,
          {
                    key: locale,
                    href: buildHref(basePath, locale),
                    hrefLang: locale,
                    "aria-current": locale === active ? "true" : undefined,
                    style: {
                                fontWeight: locale === active ? 700 : 400,
                                opacity: locale === active ? 1 : 0.6,
                    },
          },
                LABELS[locale]
              )
                                                 );

  return createElement(
        "div",
    {
            className,
            style: { display: "inline-flex", gap: "0.5rem", alignItems: "center" },
    },
        links
      );
}
