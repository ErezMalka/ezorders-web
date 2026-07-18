import type { MetadataRoute } from "next";

const BASE = "https://ezorders.com";

const enPaths = [
  "",
  "/about",
  "/contact",
  "/digital-menus",
  "/kiosk-stands",
  "/price",
  "/privacy",
  "/restaurant-ordering-app",
  "/restaurant-ordering-website",
  "/solutions",
];

const hePaths = [
  "/he",
  "/he/about",
  "/he/contact",
  "/he/digital-menus",
  "/he/kiosk-stands",
  "/he/kitchen-display",
  "/he/pos",
  "/he/price",
  "/he/privacy",
  "/he/qr-ordering",
  "/he/restaurant-ordering-app",
  "/he/restaurant-ordering-website",
  "/he/solutions",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [...enPaths, ...hePaths].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" || path === "/he" ? 1 : 0.8,
  }));
}
