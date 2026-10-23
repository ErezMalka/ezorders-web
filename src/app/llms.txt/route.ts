import { organizationSchema } from "@/app/_shared/site-metadata";
import { GENERAL_FAQ } from "@/data/faq";
import { getAllArticles } from "@/lib/content/articles";
import { PRICING_CONFIG } from "@/lib/pricing";

/**
 * /llms.txt — a plain-text map of the site for AI assistants and answer
 * engines (https://llmstxt.org).
 *
 * BUILT, NOT WRITTEN. Every fact below is read from the object the site
 * already renders it from: prices from PRICING_CONFIG (the /price calculator),
 * contact details and founding year from the Organization JSON-LD, the
 * questions and answers from the FAQ blocks on the product pages, the article
 * list from the blog. A hand-written copy would be the one place on the site
 * still quoting last year's price after the calculator changed.
 *
 * Nothing goes in here that the site does not already state. No customer
 * counts, ratings, legal names or social profiles.
 */

export const dynamic = "force-static";

const SITE = "https://ezorders.com";

const shekels = (n: number) => `ILS ${n.toLocaleString("en-US")}`;

function build(): string {
  const org = organizationSchema;
  const support = org.contactPoint[0];
  const hours = support.hoursAvailable;
  if (!hours) throw new Error("llms.txt: the support ContactPoint has no hoursAvailable");
  const days = `${hours.dayOfWeek[0]}–${hours.dayOfWeek[hours.dayOfWeek.length - 1]}`;

  const core = Object.fromEntries(PRICING_CONFIG.coreProducts.map((p) => [p.id, p]));
  const maxDiscount = Math.max(...PRICING_CONFIG.discountTiers.map((t) => t.pct));

  const pages: [string, string, string][] = [
    // [title, Hebrew path, English path or ""]
    ["Home", "/he", "/en"],
    ["Pricing and cost calculator", "/he/price", "/en/price"],
    ["The platform: one system for the whole restaurant", "/he/platform", "/en/platform"],
    ["POS for restaurants", "/he/pos", "/en/pos"],
    ["Self-order kiosk stands", "/he/kiosk-stands", "/en/kiosk-stands"],
    ["Restaurant ordering website", "/he/restaurant-ordering-website", "/en/restaurant-ordering-website"],
    ["Branded restaurant ordering app", "/he/restaurant-ordering-app", "/en/restaurant-ordering-app"],
    ["Digital menus", "/he/digital-menus", "/en/digital-menus"],
    ["Kitchen display system (KDS)", "/he/kitchen-display", ""],
    ["QR ordering from the table", "/he/qr-ordering", ""],
    ["Delivery-platform integrations (Wolt, 10bis, Cibus and more)", "/he/integrations", ""],
    ["Glossary of restaurant terms (POS, KDS, X/Z reports)", "/he/glossary", ""],
    ["About EZOrders", "/he/about", "/en/about"],
    ["Contact and demo", "/he/contact", "/en/contact"],
    ["Blog", "/he/blog", "/en/blog"],
  ];

  const pageLines = pages.map(([title, he, en]) =>
    en
      ? `- [${title}](${SITE}${he}): Hebrew. English version: ${SITE}${en}`
      : `- [${title}](${SITE}${he}): Hebrew only`,
  );

  const articles = getAllArticles().map(
    (a) => `- [${a.title}](${a.canonicalUrl}): ${a.locale === "he" ? "Hebrew" : "English"}`,
  );

  const faq = GENERAL_FAQ.en.flatMap((f) => [`### ${f.q}`, "", f.a, ""]);

  return [
    "# EZOrders",
    "",
    "> EZOrders is a restaurant management and ordering system for restaurants and quick-service chains in Israel: POS, ordering website, self-order kiosks, digital menus, a branded ordering app, kitchen display (KDS) and a loyalty club, all on one menu and one report. The website is in Hebrew (primary) and English.",
    "",
    "## Facts",
    "",
    `- Founded: ${org.foundingDate}`,
    "- Based in: Haifa, Israel. Serves restaurants in Israel.",
    `- Customer support: ${support.telephone}, ${days} ${hours.opens}–${hours.closes}, by phone and WhatsApp. Email: ${org.email}`,
    `- Pricing (ILS, before VAT): one-time initial system setup ${shekels(PRICING_CONFIG.initialSetup.setup)}; POS ${shekels(core.pos.monthly)}/month per till; ordering website ${shekels(core.website.monthly)}/month per branch; kiosk ${shekels(core.kiosk.monthly)}/month per station. Each component also has a one-time setup fee. Monthly volume discount up to ${maxDiscount}%. Full calculator: ${SITE}/en/price`,
    "- Delivery and payment platforms connected: Wolt, 10bis (Tenbis), Cibus, Zap Rest, Mishloha and HAAT. Orders from every channel arrive on the same screen and in the same reports.",
    "- Payment methods (add-ons): Bit, Apple Pay and Google Pay.",
    "",
    "## Key pages",
    "",
    ...pageLines,
    "",
    ...(articles.length ? ["## Articles", "", ...articles, ""] : []),
    "## Common questions",
    "",
    ...faq,
  ].join("\n");
}

export function GET() {
  return new Response(build(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
