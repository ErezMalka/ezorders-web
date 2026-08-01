/**
 * Build-time article loader.
 *
 * Reads content/<locale>/<slug>.md, parses, validates, and returns typed
 * Articles. Runs on the server at build time only — never in the browser.
 *
 * Two behaviours that matter:
 *
 *   DRAFT EXCLUSION. Drafts are dropped from production builds. A draft is
 *   visible only when NEXT_PUBLIC_SHOW_DRAFTS === "true" (set it on a Vercel
 *   Preview to review before publishing). Production never shows a draft even
 *   if the flag is set, because the flag is easy to leave on by accident.
 *
 *   FAIL-CLOSED. A malformed article, a duplicate slug, or a slug that does not
 *   match its filename stops the BUILD. Publishing a broken article is worse
 *   than failing to publish.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { locales, type Locale } from "@/i18n/config";
import { parseFrontmatter } from "./frontmatter";
import { validateArticle, ArticleValidationError, type Article } from "./schema";

const CONTENT_ROOT = join(process.cwd(), "content");

function showDrafts(): boolean {
  return (
    process.env.NEXT_PUBLIC_SHOW_DRAFTS === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production"
  );
}

/** Load and validate every article for a locale, newest first. */
export function getArticles(locale: Locale): Article[] {
  const dir = join(CONTENT_ROOT, locale);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort(); // deterministic read order

  const seen = new Map<string, string>();
  const articles: Article[] = [];

  for (const file of files) {
    const full = join(dir, file);
    const raw = readFileSync(full, "utf8");

    let article: Article;
    try {
      const { data, body } = parseFrontmatter(raw);
      article = validateArticle(`${locale}/${file}`, data, body);
    } catch (err) {
      // Re-throw with the file named. A build failure must say which file.
      if (err instanceof ArticleValidationError) throw err;
      throw new Error(`Failed to parse content/${locale}/${file}: ${(err as Error).message}`);
    }

    if (article.locale !== locale) {
      throw new Error(
        `content/${locale}/${file}: frontmatter locale "${article.locale}" does not match its directory "${locale}".`
      );
    }

    const expected = `${article.slug}.md`;
    if (file !== expected) {
      throw new Error(
        `content/${locale}/${file}: filename must match the slug (expected "${expected}").\n` +
          `  → The filename and the slug are both the article's identity; they cannot disagree.`
      );
    }

    // Duplicate-slug protection: two articles resolving to one URL is a silent
    // content loss, so it fails the build instead.
    const prev = seen.get(article.slug);
    if (prev) {
      throw new Error(
        `Duplicate article slug "${article.slug}" in locale "${locale}": ${prev} and ${file}.`
      );
    }
    seen.set(article.slug, file);

    if (article.draft && !showDrafts()) continue;
    articles.push(article);
  }

  // Newest first; slug as a stable tie-break so ordering never depends on the
  // filesystem.
  return articles.sort((a, b) =>
    b.publishedAt !== a.publishedAt
      ? b.publishedAt.localeCompare(a.publishedAt)
      : a.slug.localeCompare(b.slug)
  );
}

/** One article, or null when it does not exist / is a hidden draft. */
export function getArticle(locale: Locale, slug: string): Article | null {
  return getArticles(locale).find((a) => a.slug === slug) ?? null;
}

/** Slugs for generateStaticParams. */
export function getArticleSlugs(locale: Locale): string[] {
  return getArticles(locale).map((a) => a.slug);
}

/** Every published article across every locale — used by the sitemap. */
export function getAllArticles(): Article[] {
  return locales.flatMap((locale) => getArticles(locale));
}

/**
 * Validate all locales without rendering. Called by the CI content check so a
 * malformed article fails fast with a clear message rather than mid-build.
 */
export function validateAllArticles(): { locale: Locale; count: number }[] {
  return locales.map((locale) => ({ locale, count: getArticles(locale).length }));
}
