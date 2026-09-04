const SITE = "https://ezorders.com";

/**
 * BreadcrumbList for a product page.
 *
 * The article system has emitted this since it was built; the marketing pages
 * never did. It changes how the URL is drawn in a result — Google renders the
 * trail instead of the raw path — and it states the site's hierarchy plainly
 * for anything trying to work out how the pages relate.
 *
 * Home > Solutions > this page, matching the navigation a visitor actually sees.
 */
export function breadcrumbSchema(
  locale: "he" | "en",
  page: { name: string; path: string },
) {
  const he = locale === "he";
  const trail = [
    { name: he ? "דף הבית" : "Home", url: `${SITE}/${locale}` },
    { name: he ? "פתרונות" : "Solutions", url: `${SITE}/${locale}/solutions` },
    { name: page.name, url: `${SITE}/${locale}${page.path}` },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: step.url,
    })),
  };
}
