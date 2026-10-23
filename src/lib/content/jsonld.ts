/**
 * Structured data for article pages.
 *
 * Mirrors buildJsonLd() in the ezorders-growth-os exporter. The site is the
 * authority at render time — the exporter's copy exists so the package can be
 * validated before it ever reaches this repository.
 */

import type { Article } from "./schema";

const SITE = "https://ezorders.com";
/** The Organization node SiteScripts emits on every page (site-metadata.ts). */
const ORGANIZATION_ID = `${SITE}/#organization`;

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription,
    image: article.featuredImage ? [`${SITE}${article.featuredImage}`] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    // By @id, so the author and publisher ARE the site's Organization (with its
    // address, phone and founding date) rather than an unconnected namesake.
    // Only when the byline is the company; a person's byline stays a name.
    author:
      article.author === "EZOrders"
        ? { "@type": "Organization", "@id": ORGANIZATION_ID, name: "EZOrders", url: SITE }
        : { "@type": "Organization", name: article.author, url: SITE },
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "EZOrders", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": article.canonicalUrl },
    inLanguage: article.locale,
    wordCount: article.wordCount || undefined,
    keywords: article.tags.length ? article.tags.join(", ") : undefined,
  };
}

export function breadcrumbJsonLd(article: Article, blogLabel: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EZOrders", item: `${SITE}/${article.locale}` },
      { "@type": "ListItem", position: 2, name: blogLabel, item: `${SITE}/${article.locale}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: article.canonicalUrl },
    ],
  };
}

/** Serialize for embedding. Strips undefined so no `"key":undefined` ships. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v));
}
