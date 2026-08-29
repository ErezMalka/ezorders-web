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

/**
 * Who EZOrders is, in the form a search engine and an AI assistant can verify.
 *
 * `sameAs` is the important field and the one still empty. It is how a search
 * engine ties this domain to the same company mentioned elsewhere — the profile
 * URLs are the evidence that an entity exists behind the site. Until it has
 * real URLs in it, EZOrders is a domain rather than a known organisation.
 *
 * Add profiles here as they come; an empty array is honest, a fabricated one is
 * not, and pointing at a page that does not exist is worse than pointing at
 * nothing.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://ezorders.com/#organization",
  name: "EZOrders",
  legalName: "EZOrders",
  url: "https://ezorders.com",
  logo: {
    "@type": "ImageObject",
    url: "https://ezorders.com/images/logo.png",
  },
  image: "https://ezorders.com/images/logo.png",
  description: SITE_DESCRIPTION,
  telephone: "*4958",
  email: "contact@ezorders.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "פל ים 2",
    addressLocality: "חיפה",
    addressCountry: "IL",
  },
  areaServed: { "@type": "Country", name: "Israel" },
  knowsLanguage: ["he", "en"],
  // Checked while logged OUT before being added here. A logged-in check proves
  // nothing: an unpublished page still renders for its own admin. The page also
  // states the same street address and email as the fields above, which is the
  // consistency the entity match depends on.
  sameAs: ["https://www.facebook.com/profile.php?id=61591771392713"],
};
