/**
 * RSS 2.0 feed for a locale's articles.
 *
 * Hand-built rather than pulling a feed library: the output is a small, fixed
 * document and this repository keeps its dependency count deliberately low.
 *
 * Drafts never appear — getArticles() already excludes them, so a draft cannot
 * leak into a feed that readers and aggregators poll.
 */

import { getArticles } from "./articles";
import type { Locale } from "@/i18n/config";

const SITE = "https://ezorders.com";

const FEED_META: Record<Locale, { title: string; description: string; language: string }> = {
  en: {
    title: "EZOrders Blog",
    description:
      "Practical guides for quick-service restaurant operators: online ordering, self-order kiosks, kitchen flow, and the numbers behind them.",
    language: "en",
  },
  he: {
    title: "הבלוג של EZOrders",
    description:
      "מדריכים פרקטיים למפעילי מסעדות מהיר: הזמנות אונליין, עמדות שירות עצמי, זרימת מטבח והמספרים שמאחוריהם.",
    language: "he",
  },
};

/** XML text escaping. Applied to every interpolated value without exception. */
function xml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date, which RSS requires — not ISO 8601. */
function rfc822(isoDate: string): string {
  // Midday UTC avoids a date-only value shifting a day across timezones.
  return new Date(`${isoDate}T12:00:00Z`).toUTCString();
}

export function buildRssFeed(locale: Locale): string {
  const meta = FEED_META[locale];
  const articles = getArticles(locale);
  const feedUrl = `${SITE}/${locale}/blog/feed.xml`;
  const blogUrl = `${SITE}/${locale}/blog`;

  // lastBuildDate tracks the newest article rather than "now", so an unchanged
  // feed is byte-identical between builds and does not look perpetually updated.
  const newest = articles[0]?.updatedAt;

  const items = articles
    .map((a) => {
      const image = a.featuredImage ? `${SITE}${a.featuredImage}` : null;
      return `    <item>
      <title>${xml(a.title)}</title>
      <link>${xml(a.canonicalUrl)}</link>
      <guid isPermaLink="true">${xml(a.canonicalUrl)}</guid>
      <description>${xml(a.excerpt)}</description>
      <pubDate>${rfc822(a.publishedAt)}</pubDate>
      <category>${xml(a.category)}</category>${a.tags
        .map((t) => `\n      <category>${xml(t)}</category>`)
        .join("")}${
        image ? `\n      <enclosure url="${xml(image)}" type="image/webp" length="0"/>` : ""
      }
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(meta.title)}</title>
    <link>${xml(blogUrl)}</link>
    <description>${xml(meta.description)}</description>
    <language>${xml(meta.language)}</language>
    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml"/>${
      newest ? `\n    <lastBuildDate>${rfc822(newest)}</lastBuildDate>` : ""
    }
${items}
  </channel>
</rss>
`;
}
