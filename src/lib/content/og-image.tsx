/**
 * Generated Open Graph card for article pages.
 *
 * WHY THIS EXISTS: an article's social card should never depend on whether a
 * cover image has been generated yet. Before this, an article published ahead of
 * its cover had no `og:image` at all, so every share rendered as a blank card —
 * permanently, until someone remembered to backfill the image.
 *
 * This produces a branded card from the article's own metadata at request time.
 * When a real cover DOES exist, `metadata.ts` sets `openGraph.images` explicitly
 * and that wins; this is the fallback, not a replacement.
 *
 * Uses `next/og`, which ships with Next — no new dependency.
 *
 * Constraints of the ImageResponse renderer (Satori), worth knowing before
 * editing: inline styles only (no Tailwind), flexbox only (no grid/float), every
 * multi-child element needs an explicit `display: flex`, and only a small subset
 * of CSS is supported.
 */

import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/config";
import { getArticle } from "./articles";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

// Brand tokens, duplicated as literals because Satori cannot read Tailwind.
// Keep in sync with tailwind.config.ts -> theme.extend.colors.brand.
const BRAND = {
  dark: "#191D2A",
  pink: "#F05D86",
  indigo: "#3B33C8",
  white: "#FFFFFF",
  muted: "#9AA1B1",
} as const;

/** Trim a title to something that reliably fits the card. */
function fit(title: string, max = 90): string {
  if (title.length <= max) return title;
  return title.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/**
 * Build the OG image for one article.
 * Falls back to a generic branded card when the slug does not resolve, so this
 * route can never throw and break an otherwise healthy page.
 */
export function buildArticleOgImage(locale: Locale, slug: string): ImageResponse {
  const article = getArticle(locale, slug);

  const title = article ? fit(article.title) : "EZOrders";
  const category = article?.category ?? "Restaurant Technology";
  const readingTime = article ? `${article.readingTimeMinutes} min read` : "";
  const isRtl = locale === "he";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BRAND.dark,
          padding: "64px 72px",
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        {/* Accent bar */}
        <div style={{ display: "flex", height: 10, width: 180 }}>
          <div style={{ display: "flex", flex: 1, backgroundColor: BRAND.pink }} />
          <div style={{ display: "flex", flex: 1, backgroundColor: BRAND.indigo }} />
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: BRAND.pink,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 55 ? 60 : 72,
              fontWeight: 700,
              color: BRAND.white,
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: BRAND.white }}>
            <span style={{ color: BRAND.pink }}>EZ</span>
            <span style={{ color: BRAND.white }}>Orders</span>
          </div>
          {readingTime ? (
            <div style={{ display: "flex", fontSize: 24, color: BRAND.muted }}>{readingTime}</div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
