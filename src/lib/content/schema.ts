/**
 * Article content schema + validation.
 *
 * Articles are authored as Markdown files with YAML-ish frontmatter under
 * content/<locale>/<slug>.md, produced deterministically by the ezorders-growth-os
 * export adapter.
 *
 * Validation is FAIL-CLOSED and runs at BUILD TIME: an article that does not
 * satisfy this schema stops the build with an actionable message rather than
 * shipping a broken page. A content pipeline that can publish a malformed
 * article is worse than one that refuses to publish.
 */

import { locales, type Locale } from "@/i18n/config";

export type ArticleSource = {
  title: string;
  url: string;
};

export type ArticleVisual = {
  template: string;
  aspectRatio: string;
  systemVersion: string;
};

export type ArticleQuality = {
  qaScore: number | null;
  qaOverall: string | null;
  groundedClaims: number;
  groundingWarnings: number;
  groundingVerdict: string | null;
  sourceCount: number;
};

export type Article = {
  /** Stable identity on the site. Lowercase kebab-case. */
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  author: string;
  category: string;
  tags: string[];
  /** ISO date, YYYY-MM-DD. */
  publishedAt: string;
  updatedAt: string;
  canonicalUrl: string;
  readingTimeMinutes: number;
  wordCount: number;
  cta: { label: string; href: string };
  featuredImage: string | null;
  imageAlt: string;
  sources: ArticleSource[];
  visual: ArticleVisual | null;
  quality: ArticleQuality | null;
  /** Draft articles are excluded from production builds. */
  draft: boolean;
  /** Raw Markdown body (rendered by lib/content/markdown.ts). */
  body: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Field-level limits. Kept here so the site and CI check identical numbers. */
export const LIMITS = {
  titleMax: 120,
  seoTitleMax: 60,
  seoDescriptionMin: 70,
  seoDescriptionMax: 155,
  excerptMax: 300,
  imageAltMax: 125,
  bodyMinChars: 400,
} as const;

export class ArticleValidationError extends Error {
  readonly file: string;
  readonly problems: string[];

  constructor(file: string, problems: string[]) {
    super(
      `Invalid article "${file}":\n` +
        problems.map((p) => `  → ${p}`).join("\n") +
        `\n  → Fix the source file; do not relax the schema to make a build pass.`
    );
    this.name = "ArticleValidationError";
    this.file = file;
    this.problems = problems;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Validate parsed frontmatter + body into a typed Article.
 * Collects EVERY problem before throwing, so one build run reports the full list
 * instead of making the author fix issues one at a time.
 */
export function validateArticle(
  file: string,
  data: Record<string, unknown>,
  body: string
): Article {
  const problems: string[] = [];

  const slug = str(data.slug);
  if (!slug) problems.push("`slug` is required");
  else if (!SLUG_RE.test(slug)) problems.push(`\`slug\` must be lowercase kebab-case (got "${slug}")`);

  const locale = str(data.locale) as Locale;
  if (!locale) problems.push("`locale` is required");
  else if (!(locales as readonly string[]).includes(locale))
    problems.push(`\`locale\` must be one of ${locales.join(" | ")} (got "${locale}")`);

  const title = str(data.title);
  if (!title) problems.push("`title` is required");
  else if (title.length > LIMITS.titleMax) problems.push(`\`title\` exceeds ${LIMITS.titleMax} chars`);

  const seoTitle = str(data.seoTitle) || title;
  if (seoTitle.length > LIMITS.seoTitleMax)
    problems.push(`\`seoTitle\` exceeds ${LIMITS.seoTitleMax} chars (got ${seoTitle.length})`);

  const seoDescription = str(data.seoDescription) || str(data.excerpt);
  if (!seoDescription) problems.push("`seoDescription` is required");
  else if (
    seoDescription.length < LIMITS.seoDescriptionMin ||
    seoDescription.length > LIMITS.seoDescriptionMax
  )
    problems.push(
      `\`seoDescription\` must be ${LIMITS.seoDescriptionMin}-${LIMITS.seoDescriptionMax} chars (got ${seoDescription.length})`
    );

  const excerpt = str(data.excerpt) || seoDescription;
  if (excerpt.length > LIMITS.excerptMax) problems.push(`\`excerpt\` exceeds ${LIMITS.excerptMax} chars`);

  const publishedAt = str(data.publishedAt);
  if (!publishedAt) problems.push("`publishedAt` is required");
  else if (!DATE_RE.test(publishedAt)) problems.push("`publishedAt` must be YYYY-MM-DD");

  const updatedAt = str(data.updatedAt) || publishedAt;
  if (updatedAt && !DATE_RE.test(updatedAt)) problems.push("`updatedAt` must be YYYY-MM-DD");

  const imageAlt = str(data.imageAlt);
  const featuredImage = str(data.featuredImage) || null;
  // Alt text is required whenever an image is referenced — an unlabelled cover
  // is an accessibility defect, not a cosmetic one.
  if (featuredImage && !imageAlt) problems.push("`imageAlt` is required when `featuredImage` is set");
  if (imageAlt.length > LIMITS.imageAltMax)
    problems.push(`\`imageAlt\` exceeds ${LIMITS.imageAltMax} chars (got ${imageAlt.length})`);
  if (featuredImage && !featuredImage.startsWith("/images/blog/"))
    problems.push("`featuredImage` must live under /images/blog/");

  if (!body || body.trim().length < LIMITS.bodyMinChars)
    problems.push(`body must be at least ${LIMITS.bodyMinChars} characters`);

  // Raw HTML in article Markdown is rejected outright. Defence in depth: the
  // renderer also sanitizes, but refusing is safer than cleaning, and this
  // content is machine-generated so there is no legitimate reason for it.
  if (/<\s*[a-zA-Z][^>]*>/.test(body)) problems.push("body must not contain raw HTML tags");

  const sources = normalizeSources(data.sources, problems);
  const tags = Array.isArray(data.tags) ? data.tags.map(str).filter(Boolean) : [];

  if (problems.length) throw new ArticleValidationError(file, problems);

  return {
    slug,
    locale,
    title,
    excerpt,
    seoTitle,
    seoDescription,
    author: str(data.author) || "EZOrders",
    category: str(data.category) || "Restaurant Technology",
    tags,
    publishedAt,
    updatedAt,
    canonicalUrl: str(data.canonicalUrl) || `https://ezorders.com/${locale}/blog/${slug}`,
    readingTimeMinutes: toInt(data.readingTimeMinutes, 1),
    wordCount: toInt(data.wordCount, 0),
    cta: normalizeCta(data.cta, locale),
    featuredImage,
    imageAlt,
    sources,
    visual: normalizeVisual(data.visual),
    quality: normalizeQuality(data.quality),
    draft: data.draft === true || data.draft === "true",
    body,
  };
}

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeCta(v: unknown, locale: Locale): { label: string; href: string } {
  if (isRecord(v) && str(v.label) && str(v.href)) {
    return { label: str(v.label), href: str(v.href) };
  }
  return { label: "Book a Demo", href: `/${locale}/contact` };
}

function normalizeSources(v: unknown, problems: string[]): ArticleSource[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    problems.push("`sources` must be a list");
    return [];
  }
  const out: ArticleSource[] = [];
  for (const item of v) {
    if (!isRecord(item)) continue;
    const url = str(item.url);
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) {
      problems.push(`source url must be absolute http(s) (got "${url}")`);
      continue;
    }
    out.push({ title: str(item.title) || url, url });
  }
  return out;
}

function normalizeVisual(v: unknown): ArticleVisual | null {
  if (!isRecord(v)) return null;
  return {
    template: str(v.template),
    aspectRatio: str(v.aspectRatio) || "16:9",
    systemVersion: str(v.systemVersion),
  };
}

function normalizeQuality(v: unknown): ArticleQuality | null {
  if (!isRecord(v)) return null;
  const g = isRecord(v.grounding) ? v.grounding : {};
  return {
    qaScore: typeof v.qaScore === "number" ? v.qaScore : null,
    qaOverall: str(v.qaOverall) || null,
    groundedClaims: toInt(g.groundedClaims, 0),
    groundingWarnings: toInt(g.warnings, 0),
    groundingVerdict: str(g.verdict) || null,
    sourceCount: toInt(v.sourceCount, 0),
  };
}
