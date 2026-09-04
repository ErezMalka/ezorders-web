import type { Metadata } from "next";
import { baseMetadata } from "./site-metadata";
import type { Locale } from "@/i18n/config";

const OG_LOCALE: Record<Locale, string> = { he: "he_IL", en: "en_US" };

/**
 * Per-locale root metadata.
 *
 * Two things every public page needs and none of them declared:
 *
 * 1. `canonical: "./"` — Next resolves this against the current pathname, so
 *    each route gets its own canonical from one declaration here. Without it
 *    every tracking parameter (?gclid=, ?utm_source=, ?fbclid=) was a separate
 *    URL as far as a crawler was concerned, and the site runs Google Ads and
 *    Meta, so that was happening on every paid click.
 *
 * 2. `og:locale` matching the page. The base object declares en_US, which the
 *    Hebrew tree was inheriting verbatim — every /he page announced itself as
 *    American English to anything reading Open Graph.
 */
export function localeMetadata(locale: Locale): Metadata {
  const other: Locale = locale === "he" ? "en" : "he";
  return {
    ...baseMetadata,
    alternates: { canonical: "./" },
    openGraph: {
      ...baseMetadata.openGraph,
      locale: OG_LOCALE[locale],
      alternateLocale: OG_LOCALE[other],
    },
  };
}
