import type { Metadata } from "next";

// Base site metadata + Organization schema, shared verbatim by every root layout
// so the metadata output is identical to the previous single-root layout. Pages
// override individual fields (title, canonical, og:locale, …) as they did before.
const SITE_DESCRIPTION =
  "EZorders turns offline to online — POS, digital menus, online ordering, kiosk stands, loyalty and multi-branch management for modern restaurants.";

// Meta Business "facebook-domain-verification" code, added to every page's <head>
// to prove domain ownership in Business Manager (needed for Aggregated Event
// Measurement). Set NEXT_PUBLIC_FB_DOMAIN_VERIFICATION to enable; safe no-op when unset.
const FB_DOMAIN_VERIFICATION = process.env.NEXT_PUBLIC_FB_DOMAIN_VERIFICATION;

export const baseMetadata: Metadata = {
  title: {
    default: "ezorders",
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL("https://ezorders.com"),
  applicationName: "EZOrders",
  keywords: [
    "restaurant ordering system",
    "restaurant POS",
    "digital menu",
    "online ordering",
    "kiosk",
    "restaurant management",
    "loyalty",
    "מערכת הזמנות למסעדות",
    "קופה למסעדה",
    "תפריט דיגיטלי",
  ],
  openGraph: {
    type: "website",
    siteName: "EZOrders",
    title: "EZOrders — restaurant ordering & management system",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    alternateLocale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "EZOrders — restaurant ordering & management system",
    description: SITE_DESCRIPTION,
  },
  ...(FB_DOMAIN_VERIFICATION
    ? { verification: { other: { "facebook-domain-verification": FB_DOMAIN_VERIFICATION } } }
    : {}),
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EZOrders",
  url: "https://ezorders.com",
  description: SITE_DESCRIPTION,
  telephone: "*4958",
  sameAs: [] as string[],
};
