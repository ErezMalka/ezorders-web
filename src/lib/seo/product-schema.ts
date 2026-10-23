import { PRICING_CONFIG } from "@/lib/pricing";

const SITE = "https://ezorders.com";

/**
 * The Organization node emitted on every page by SiteScripts
 * (src/app/_shared/site-metadata.ts). Referencing it by @id, instead of
 * restating name and url, tells a parser that the provider here is that same
 * entity — with its address, phone, founding date and profiles — rather than a
 * second, thinner organisation that happens to share a name.
 */
export const ORGANIZATION_ID = `${SITE}/#organization`;

/**
 * SoftwareApplication + AggregateOffer for the pricing page.
 *
 * Until now the only structured data on the whole site was Organization, so
 * nothing told a search engine that this page describes software that is sold,
 * what it costs, or in which currency.
 *
 * Prices are READ FROM PRICING_CONFIG, never restated here. A price that lives
 * in two places drifts, and schema that contradicts the price a visitor can see
 * on the page is worse than no schema at all.
 *
 * Deliberately NO aggregateRating. Google renders stars for this type and it is
 * tempting, but a rating without collected reviews behind it is a fabrication
 * and a policy violation. Stars have to be earned first.
 */
export function softwareApplicationSchema(locale: "he" | "en") {
  // Core products only. Including the add-ons would make lowPrice ₪25 — the BIT
  // payments module — and a search result reading "from ₪25" would misdescribe
  // what it costs to run the system. Nobody buys a payment add-on on its own.
  const monthly = PRICING_CONFIG.coreProducts
    .map((p) => (p as { monthly?: number }).monthly)
    .filter((n): n is number => typeof n === "number" && n > 0);

  const he = locale === "he";

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE}/${locale}/price#software`,
    name: "EZOrders",
    url: `${SITE}/${locale}/price`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: he
      ? "מערכת קופה והזמנות למסעדות"
      : "Restaurant POS and online ordering system",
    operatingSystem: "Web, iOS, Android",
    inLanguage: ["he", "en"],
    description: he
      ? "מערכת לניהול מסעדה: קופה, אתר הזמנות, עמדות קיוסק, תפריט דיגיטלי, מועדון לקוחות ומסך מטבח — מסונכרנים בזמן אמת."
      : "Restaurant management system: POS, ordering website, self-order kiosks, digital menu, loyalty and kitchen display, synchronised in real time.",
    featureList: [
      ...PRICING_CONFIG.coreProducts.map((p) => p.label),
      ...PRICING_CONFIG.addonsIncluded.map((p) => p.label),
    ],
    provider: { "@id": ORGANIZATION_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ILS",
      lowPrice: Math.min(...monthly),
      highPrice: Math.max(...monthly),
      offerCount: monthly.length,
      availability: "https://schema.org/InStock",
      url: `${SITE}/${locale}/price`,
      // These are per-component monthly figures. The one-time setup is stated
      // here too so the low price is not read as the cost of the whole system.
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "ILS",
        unitCode: "MON",
        // PRICING_CONFIG is pre-VAT throughout, and the calculator says so.
        valueAddedTaxIncluded: false,
        description: he
          ? `מחיר חודשי לרכיב. הקמה חד-פעמית מ-${PRICING_CONFIG.initialSetup.setup} ₪.`
          : `Monthly price per component. One-time setup from ILS ${PRICING_CONFIG.initialSetup.setup}.`,
      },
    },
  };
}

type ProductPage = "pos" | "kitchen-display";

/**
 * SoftwareApplication for a single product page (/pos, /kitchen-display).
 *
 * The price page describes the system as a whole; these describe the one
 * component the page is about, so an answer engine asked "how much is the
 * EZOrders POS" finds the figure on the page that is about the POS.
 *
 * Every number is read from PRICING_CONFIG — the same object the public
 * calculator on /price renders — never restated. Prices are pre-VAT, and the
 * one-time charges are spelled out in the description so the monthly figure is
 * not read as the whole cost. No rating, for the reason given above.
 *
 * Not used on /he/kiosk-stands or /he/digital-menus, whose pages are frozen
 * during a running SEO measurement.
 */
export function productSoftwareSchema(locale: "he" | "en", page: ProductPage) {
  const he = locale === "he";
  const item =
    page === "pos"
      ? PRICING_CONFIG.coreProducts.find((p) => p.id === "pos")
      : PRICING_CONFIG.addonsIncluded.find((p) => p.id === "kds");
  if (!item) throw new Error(`productSoftwareSchema: no PRICING_CONFIG entry for ${page}`);

  const initial = PRICING_CONFIG.initialSetup.setup;
  const copy = {
    pos: {
      name: he ? "EZOrders — מערכת קופה למסעדות" : "EZOrders POS",
      sub: he ? "מערכת קופה (POS) למסעדות" : "Restaurant POS",
      unit: he ? "לקופה" : "per till",
    },
    "kitchen-display": {
      name: he ? "EZOrders — מסך מטבח KDS" : "EZOrders Kitchen Display (KDS)",
      sub: he ? "מסך מטבח דיגיטלי (KDS) למסעדות" : "Restaurant kitchen display system",
      unit: he ? "למסך" : "per screen",
    },
  }[page];

  const url = `${SITE}/${locale}/${page}`;
  const priceUrl = `${SITE}/${locale}/price`;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name: copy.name,
    url,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: copy.sub,
    inLanguage: locale,
    provider: { "@id": ORGANIZATION_ID },
    offers: {
      "@type": "Offer",
      price: item.monthly,
      priceCurrency: "ILS",
      availability: "https://schema.org/InStock",
      url: priceUrl,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: item.monthly,
        priceCurrency: "ILS",
        unitCode: "MON",
        valueAddedTaxIncluded: false,
        description: he
          ? `${item.monthly} ₪ לחודש ${copy.unit}, לפני מע״מ. הקמה חד-פעמית: ${item.setup} ₪ ${copy.unit}, בנוסף להקמת מערכת ראשונית של ${initial.toLocaleString("en-US")} ₪.`
          : `ILS ${item.monthly} a month ${copy.unit}, excluding VAT. One-time setup: ILS ${item.setup} ${copy.unit}, plus the initial system setup of ILS ${initial.toLocaleString("en-US")}.`,
      },
    },
  };
}
