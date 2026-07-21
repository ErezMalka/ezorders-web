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
 * "/he/about" -> "/about", "/en/about" -> "/about", "/he" -> "/", "/en" -> "/"
 */
function stripLocale(pathname: string): string {
  if (pathname === "/he" || pathname === "/en") return "/";
  if (pathname.startsWith("/he/") || pathname.startsWith("/en/")) {
    return pathname.slice(3);
  }
  return pathname;
}

/**
 * Builds the href for a given target locale, preserving the current route.
 * Both locales are prefixed: "/en/about" <-> "/he/about", "/en" <-> "/he".
 */
function buildHref(basePath: string, target: Locale): string {
  return basePath === "/" ? `/${target}` : `/${target}${basePath}`;
}

function currentLocale(pathname: string): Locale {
  return pathname === "/he" || pathname.startsWith("/he/") ? "he" : "en";
}

/** Persist the choice so the middleware can honour it on "/". */
function persistLocale(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
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
        onClick: () => persistLocale(locale),
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
