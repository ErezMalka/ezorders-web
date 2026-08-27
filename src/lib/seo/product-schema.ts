import { PRICING_CONFIG } from "@/lib/pricing";

const SITE = "https://ezorders.com";

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
    provider: { "@type": "Organization", name: "EZOrders", url: SITE },
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
        description: he
          ? `מחיר חודשי לרכיב. הקמה חד-פעמית מ-${PRICING_CONFIG.initialSetup.setup} ₪.`
          : `Monthly price per component. One-time setup from ILS ${PRICING_CONFIG.initialSetup.setup}.`,
      },
    },
  };
}
