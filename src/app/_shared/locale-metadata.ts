import type { Metadata } from "next";
import { baseMetadata } from "./site-metadata";
import type { Locale } from "@/i18n/config";
import { alt as ogAlt, size as ogSize } from "@/app/opengraph-image";

/**
 * The site-wide card image (src/app/opengraph-image.tsx), stated explicitly.
 *
 * A file-based opengraph-image is only inherited by pages that do not declare
 * their own `openGraph`; once a page sets one, the image has to be named or
 * the page ships a card with no picture.
 */
export const SITE_OG_IMAGE = {
  url: "/opengraph-image",
  width: ogSize.width,
  height: ogSize.height,
  alt: ogAlt,
  type: "image/png",
};

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

/**
 * A page's own metadata, with Open Graph and Twitter cards that describe THAT
 * page.
 *
 * Next merges metadata one top-level key at a time, so a page that sets
 * `title` and `description` but no `openGraph` inherits the layout's
 * `openGraph` verbatim — which is the homepage's. Every page on the site was
 * telling anything that reads Open Graph (link previews, and the AI answer
 * engines that use og:title / og:url to name and link a source) that it was
 * the English homepage at "/".
 *
 * This copies the page's title and description into og:* and twitter:*, sets
 * og:url to the page's own path (the same URL the canonical resolves to), and
 * keeps the locale-correct og:locale and the site-wide card image.
 *
 * Deliberately NOT applied to /he/kiosk-stands and /he/digital-menus: those
 * pages are in the middle of a timed SEO measurement and their page files are
 * frozen, so they keep inheriting the layout's values until it ends.
 *
 * @param path  The page's path, e.g. "/he/price" — must match its canonical.
 */
export function pageMetadata(
  path: string,
  metadata: Metadata & { title: string; description: string },
): Metadata {
  const locale: Locale = path === "/en" || path.startsWith("/en/") ? "en" : "he";
  const other: Locale = locale === "he" ? "en" : "he";
  const { title, description } = metadata;

  return {
    ...metadata,
    openGraph: {
      type: "website",
      siteName: "EZOrders",
      title,
      description,
      url: path,
      locale: OG_LOCALE[locale],
      alternateLocale: OG_LOCALE[other],
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE],
    },
  };
}
