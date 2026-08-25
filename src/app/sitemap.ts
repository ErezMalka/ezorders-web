import type { MetadataRoute } from "next";
import { getAllArticles, getTranslationGroup } from "@/lib/content/articles";

const BASE = "https://ezorders.com";

/**
 * x-default points at /he, because that is what "/" actually serves
 * (middleware.ts). The page-level hreflang says the same; these two used to
 * disagree, which left search engines with two contradictory answers about
 * where to send a visitor whose language matches neither.
 *
 * Paths are locale-agnostic; each shared path is emitted twice (/he and /en).
 */
const sharedRoutes: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/solutions", priority: 0.9 },
  { path: "/platform", priority: 0.9 },
  { path: "/pos", priority: 0.8 },
  { path: "/digital-menus", priority: 0.8 },
  { path: "/restaurant-ordering-website", priority: 0.8 },
  { path: "/kiosk-stands", priority: 0.8 },
  { path: "/restaurant-ordering-app", priority: 0.8 },
  { path: "/price", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
  { path: "/blog", priority: 0.7 },
  { path: "/privacy", priority: 0.3 },
];

/** Pages that exist only in Hebrew. */
const hebrewOnlyRoutes: { path: string; priority: number }[] = [
  { path: "/kitchen-display", priority: 0.8 },
  { path: "/qr-ordering", priority: 0.8 },
];

/** Pages that exist only in English, outside the locale prefixes. */
const rootOnlyRoutes: { path: string; priority: number }[] = [
  { path: "/connected", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const shared = sharedRoutes.flatMap((route) => {
    const heUrl = `${BASE}/he${route.path}`;
    const enUrl = `${BASE}/en${route.path}`;
    const languages = { en: enUrl, he: heUrl, "x-default": heUrl };

    return [heUrl, enUrl].map((url) => ({
      url,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route.priority,
      alternates: { languages },
    }));
  });

  const hebrewOnly = hebrewOnlyRoutes.map((route) => ({
    url: `${BASE}/he${route.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route.priority,
  }));

  const rootOnly = rootOnlyRoutes.map((route) => ({
    url: `${BASE}${route.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route.priority,
  }));

  /**
   * Published articles. Drafts are already excluded by getAllArticles(), so a
   * draft can never reach the sitemap. `lastModified` uses the article's own
   * updatedAt rather than build time, so a rebuild does not falsely signal that
   * every article changed.
   */
  const articles = getAllArticles().map((article) => {
    // Emit hreflang alternates only for locales the article is actually
    // published in. A translated pair cross-references; a single-locale article
    // gets no alternates rather than a claim that a translation exists.
    const group = getTranslationGroup(article.translationKey);
    const localeUrls = Object.entries(group) as [string, { canonicalUrl: string }][];

    const entry: {
      url: string;
      lastModified: Date;
      changeFrequency: "monthly";
      priority: number;
      alternates?: { languages: Record<string, string> };
    } = {
      url: article.canonicalUrl,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    };

    if (localeUrls.length > 1) {
      const languages: Record<string, string> = {};
      for (const [loc, a] of localeUrls) languages[loc] = a.canonicalUrl;
      languages["x-default"] = group.he?.canonicalUrl ?? article.canonicalUrl;
      entry.alternates = { languages };
    }

    return entry;
  });

  return [...shared, ...hebrewOnly, ...rootOnly, ...articles];
}
