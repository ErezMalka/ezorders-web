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
/**
 * Paths that exist in Hebrew only. Swapping the prefix on these produced a link
 * to a page that does not exist — /he/kitchen-display offered /en/kitchen-display
 * and a visitor clicking EN landed on a 404.
 */
const HEBREW_ONLY = ["/kitchen-display", "/qr-ordering", "/menu-mockup", "/queue-calculator", "/integrations"];

function buildHref(basePath: string, target: Locale): string {
  // No counterpart in the target locale, so send them to that locale's home
  // rather than to a dead URL. Losing the page is better than losing the site.
  if (target === "en" && HEBREW_ONLY.some((p) => basePath.startsWith(p))) return "/en";
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
        // Bare "EN" / "עב" measured 19x24px — below every touch-target
        // guideline. The padding gives each a 44px-tall hit area.
        className:
          "inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 transition-colors hover:bg-brand-grey",
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
      style: { display: "inline-flex", gap: "0.125rem", alignItems: "center" },
    },
    links
  );
}
