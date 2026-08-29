import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { RelatedLinks } from "@/components/sections/RelatedLinks";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";
import { GLOSSARY } from "@/data/glossary";

/**
 * Hebrew definitions for the terms a restaurant owner is expected to already
 * know while being sold a system.
 *
 * Two reasons this page is worth its keep. Each entry is a real query with
 * almost no good Hebrew answer — "מה זה KDS", "דוח X ודוח Z" — which is the
 * long tail nobody is competing for. And a definition is the shape of content
 * an assistant quotes verbatim rather than paraphrases, which is the whole
 * mechanism behind being cited at all.
 *
 * DefinedTermSet is the correct schema here and says something FAQPage cannot:
 * this is a glossary, these are its terms, and each has a name and a
 * description. Marking it up as questions would have been the lazier fit.
 */

export const metadata: Metadata = {
  title: "מילון מונחים למסעדות — POS, KDS, דוח Z | EZOrders",
  description:
    "מה זה KDS, מה ההבדל בין דוח X לדוח Z, מה עושה שבא ומה זה מספר הקצאה. המונחים שכל בעל מסעדה נתקל בהם, מוסברים בעברית פשוטה.",
  alternates: {
    canonical: "./",
    languages: { he: "/he/glossary", "x-default": "/he/glossary" },
  },
};

const sectionStyle = { padding: "8rem 1.5rem 2rem", maxWidth: "52rem", margin: "0 auto" } as const;
const listStyle = { padding: "0 1.5rem 3rem", maxWidth: "52rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#D22F63", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "1rem" } as const;
const entryStyle = {
  borderTop: "1px solid #eee",
  paddingTop: "1.75rem",
  marginTop: "1.75rem",
} as const;
const termStyle = { fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.5rem" } as const;
const shortStyle = { color: "#222", lineHeight: 1.8, fontWeight: 500, marginBottom: "0.75rem" } as const;
const detailStyle = { color: "#555", lineHeight: 1.8, marginBottom: "0.75rem" } as const;
const aliasStyle = {
  // #888 measured 3.54:1 on white, under the 4.5:1 floor. #666 is 5.74:1 and
  // still reads as secondary against the #555 body text, which was the point
  // of the lighter grey in the first place.
  color: "#666",
  fontSize: "0.9rem",
  marginBottom: "0.75rem",
} as const;
const linkStyle = { color: "#C92A5C", fontWeight: 600, textDecoration: "none" } as const;
const ctaWrapStyle = { marginTop: "2.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" } as const;
const ctaStyle = { display: "inline-block", background: "#D22F63", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;

/** Schema.org's own type for a glossary, rather than dressing it up as an FAQ. */
const definedTermSet = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": "https://ezorders.com/he/glossary#glossary",
  name: "מילון מונחים למסעדות",
  inLanguage: "he",
  url: "https://ezorders.com/he/glossary",
  hasDefinedTerm: GLOSSARY.map((t) => ({
    "@type": "DefinedTerm",
    name: t.term,
    description: t.short,
    ...(t.aliases?.length ? { alternateName: t.aliases } : {}),
    inDefinedTermSet: "https://ezorders.com/he/glossary#glossary",
  })),
};

export default function HeGlossaryPage() {
  const intro = createElement(
    "section",
    { style: sectionStyle },
    createElement("span", { style: tagStyle }, "מילון מונחים"),
    createElement("h1", { style: h1Style }, "המונחים שכולם מניחים שאתם מכירים"),
    createElement(
      "p",
      { style: leadStyle },
      "בשיחת מכירה על מערכת למסעדה נזרקים מונחים כאילו הם מובנים מאליהם — דוח Z, KDS, מסוף שבא, מספר הקצאה. הם לא מסובכים, פשוט אף אחד לא טרח להסביר אותם בעברית. כאן הם מוסברים, כולל החלק שספק בדרך כלל מדלג עליו.",
    ),
  );

  const entries = createElement(
    "section",
    { style: listStyle, "aria-label": "רשימת המונחים" },
    GLOSSARY.map((t) =>
      createElement(
        "article",
        { key: t.term, style: entryStyle },
        createElement("h2", { style: termStyle }, t.term),
        t.aliases?.length
          ? createElement("p", { style: aliasStyle }, "נקרא גם: " + t.aliases.join(" · "))
          : null,
        createElement("p", { style: shortStyle }, t.short),
        createElement("p", { style: detailStyle }, t.detail),
        t.href
          ? createElement(
              "p",
              null,
              createElement("a", { href: t.href, style: linkStyle }, "איך זה עובד אצלנו ←"),
            )
          : null,
      ),
    ),
    createElement(
      "div",
      { style: ctaWrapStyle },
      createElement("a", { href: "/he/contact", style: ctaStyle }, "יש מונח שלא ברור? שאלו אותנו"),
      createElement(WhatsAppButton, { locale: "he" }),
    ),
  );

  return createElement(
    PageLayout,
    { locale: "he" },
    createElement("script", {
      type: "application/ld+json",
      dangerouslySetInnerHTML: {
        __html: JSON.stringify(breadcrumbSchema("he", { name: "מילון מונחים", path: "/glossary" })),
      },
    }),
    createElement("script", {
      type: "application/ld+json",
      dangerouslySetInnerHTML: { __html: JSON.stringify(definedTermSet) },
    }),
    intro,
    entries,
    createElement(RelatedLinks, {
      locale: "he",
      items: [
        {
          href: "/he/blog/restaurant-pos-buyers-guide",
          title: "מה לבדוק לפני שמחליפים קופה",
          body: "המונחים כאן הם אוצר המילים; המדריך הוא מה לעשות איתו — שש בדיקות ושלוש שאלות לכל פגישת מכירה.",
        },
        {
          href: "/he/integrations",
          title: "חיבור לוולט, תן ביס וסיבוס",
          body: "המקום שבו \"אינטגרציה\" מפסיקה להיות מילה בשיחת מכירה ומתחילה להיות משהו שאפשר לבדוק.",
        },
        {
          href: "/he/commission-calculator",
          title: "מחשבון עמלות המשלוחים",
          body: "כמה עולה לכם באמת רבע עד שליש מכל הזמנה, וכמה מזה חוזר בערוץ ישיר.",
        },
      ],
    }),
  );
}
