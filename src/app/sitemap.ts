import type { MetadataRoute } from "next";

const BASE = "https://ezorders.com";

/** Path (without locale prefix), whether it has a Hebrew variant, and priority. */
const routes: { path: string; he: boolean; priority: number }[] = [
  { path: "/", he: true, priority: 1 },
  { path: "/solutions", he: true, priority: 0.9 },
  { path: "/platform", he: true, priority: 0.9 },
  { path: "/pos", he: true, priority: 0.8 },
  { path: "/digital-menus", he: true, priority: 0.8 },
  { path: "/restaurant-ordering-website", he: true, priority: 0.8 },
  { path: "/kiosk-stands", he: true, priority: 0.8 },
  { path: "/restaurant-ordering-app", he: true, priority: 0.8 },
  { path: "/price", he: true, priority: 0.7 },
  { path: "/about", he: true, priority: 0.6 },
  { path: "/contact", he: true, priority: 0.6 },
  { path: "/connected", he: false, priority: 0.4 },
  { path: "/privacy", he: true, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.flatMap((route) => {
    const enUrl = `${BASE}${route.path === "/" ? "" : route.path}`;
    const heUrl = `${BASE}/he${route.path === "/" ? "" : route.path}`;

    const languages = route.he
      ? { en: enUrl, he: heUrl, "x-default": enUrl }
      : { en: enUrl, "x-default": enUrl };

    const entries: MetadataRoute.Sitemap = [
      {
        url: enUrl,
        lastModified,
        changeFrequency: "monthly",
        priority: route.priority,
        alternates: { languages },
      },
    ];

    if (route.he) {
      entries.push({
        url: heUrl,
        lastModified,
        changeFrequency: "monthly",
        priority: route.priority,
        alternates: { languages },
      });
    }

    return entries;
  });
}
