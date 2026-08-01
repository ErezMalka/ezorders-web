import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/content/articles";

const BASE = "https://ezorders.com";

/**
 * Hebrew is the default locale, so x-default points at the Hebrew URL.
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
  const articles = getAllArticles().map((article) => ({
    url: article.canonicalUrl,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...shared, ...hebrewOnly, ...rootOnly, ...articles];
}
