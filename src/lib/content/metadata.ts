/**
 * Metadata builders for the article system.
 *
 * Shared by both locale routes so /en and /he cannot drift apart, and so the
 * canonical + hreflang rules live in exactly one place.
 */

import type { Metadata } from "next";
import { getArticle } from "./articles";
import { locales, type Locale } from "@/i18n/config";

const SITE = "https://ezorders.com";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", he: "he_IL" };

const INDEX_META: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Blog - ezorders",
    description:
      "Practical guides for quick-service restaurant operators: online ordering, self-order kiosks, kitchen flow, and the numbers behind them.",
  },
  he: {
    title: "בלוג - ezorders",
    description:
      "מדריכים פרקטיים למפעילי מסעדות מהיר: הזמנות אונליין, עמדות שירות עצמי, זרימת מטבח והמספרים שמאחוריהם.",
  },
};

/** Metadata for a blog index page. */
export function blogIndexMetadata(locale: Locale): Metadata {
  const meta = INDEX_META[locale];
  const url = `${SITE}/${locale}/blog`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: url,
      languages: languageAlternates((l) => `${SITE}/${l}/blog`),
    },
    openGraph: {
      type: "website",
      title: meta.title,
      description: meta.description,
      url,
      siteName: "EZOrders",
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

/**
 * Metadata for one article. Returns a minimal not-found metadata object rather
 * than throwing, so a missing slug renders the 404 page cleanly.
 */
export function articleMetadata(locale: Locale, slug: string): Metadata {
  const article = getArticle(locale, slug);
  if (!article) return { title: "Not found - ezorders", robots: { index: false, follow: false } };

  const image = article.featuredImage ? `${SITE}${article.featuredImage}` : undefined;

  // When a real cover exists we name it explicitly. When it does not, the
  // `images` key must be ABSENT rather than `undefined`: a present-but-undefined
  // key suppresses Next's file-convention merge, which would leave the article
  // with no og:image at all instead of falling back to the generated card in
  // opengraph-image.tsx.
  const ogImages = image
    ? { images: [{ url: image, width: 1600, height: 900, alt: article.imageAlt }] }
    : {};
  const twImages = image ? { images: [image] } : {};

  return {
    title: `${article.seoTitle} - ezorders`,
    description: article.seoDescription,
    authors: [{ name: article.author }],
    keywords: article.tags.length ? article.tags : undefined,
    alternates: {
      canonical: article.canonicalUrl,
      // Only self-reference: an article exists per locale, and claiming a
      // translation that does not exist is worse than omitting the alternate.
      languages: { [locale]: article.canonicalUrl },
    },
    // A draft that is visible on a preview must never be indexed.
    robots: article.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: article.seoTitle,
      description: article.seoDescription,
      url: article.canonicalUrl,
      siteName: "EZOrders",
      locale: OG_LOCALE[locale],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: article.tags,
      ...ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle,
      description: article.seoDescription,
      ...twImages,
    },
  };
}

function languageAlternates(build: (l: Locale) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = build(l);
  // Hebrew is the site's default locale, so x-default points at the Hebrew URL.
  out["x-default"] = build("he");
  return out;
}
