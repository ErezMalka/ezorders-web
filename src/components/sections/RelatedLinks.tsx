import { createElement } from "react";
import type { Locale } from "@/data/homeContent";

/**
 * Editorial links out of a product page.
 *
 * Two separate problems, one fix. Measured across the built site with the
 * shared chrome stripped out — a link that appears in every header tells you
 * nothing about whether the content connects:
 *
 *   * The two interactive funnels, /he/queue-calculator and /he/menu-mockup,
 *     had zero inbound links from any page body and were absent from the
 *     navigation and the sitemap. They were live, indexable, and reachable by
 *     nobody.
 *   * The blog articles are the deepest pages on the site at 1,800-2,200 words,
 *     and their only inbound links were the blog index and their own
 *     translation. No product page pointed at them, so the strongest content
 *     passed no weight to the pages that sell, and received none.
 *
 * Kept to a short list of genuinely adjacent pages rather than a link dump:
 * the point is that a reader who has just finished the page has an obvious
 * next step, not that the crawler counts more anchors.
 */

export type RelatedLink = {
  href: string;
  title: string;
  body: string;
};

const HEADING: Record<Locale, string> = {
  he: "להמשיך מכאן",
  en: "Where to go next",
};

const sectionStyle = {
  padding: "0 1.5rem 4rem",
  maxWidth: "56rem",
  margin: "0 auto",
} as const;

const headingStyle = { fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.25rem" } as const;

const listStyle = { display: "grid", gap: "0.75rem", listStyle: "none", padding: 0, margin: 0 } as const;

const cardStyle = {
  border: "1px solid #eee",
  borderRadius: "0.9rem",
  padding: "1.1rem 1.25rem",
} as const;

const linkStyle = {
  color: "#C92A5C",
  fontWeight: 600,
  textDecoration: "none",
  fontSize: "1.05rem",
} as const;

const bodyStyle = { color: "#555", lineHeight: 1.7, margin: "0.35rem 0 0" } as const;

export function RelatedLinks({
  items,
  locale = "he",
}: {
  items: RelatedLink[];
  locale?: Locale;
}) {
  if (!items.length) return null;

  return createElement(
    "section",
    { style: sectionStyle, "aria-labelledby": "related-links" },
    createElement("h2", { id: "related-links", style: headingStyle }, HEADING[locale]),
    createElement(
      "ul",
      { style: listStyle },
      items.map((item) =>
        createElement(
          "li",
          { key: item.href, style: cardStyle },
          createElement("a", { href: item.href, style: linkStyle }, item.title),
          createElement("p", { style: bodyStyle }, item.body),
        ),
      ),
    ),
  );
}
