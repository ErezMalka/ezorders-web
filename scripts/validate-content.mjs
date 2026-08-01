#!/usr/bin/env node
/**
 * Fast structural pre-check for article content.
 *
 * SCOPE, deliberately narrow: this script validates only STRUCTURAL properties
 * that carry no thresholds — the file parses, required keys exist, the filename
 * matches the slug, slugs are unique, there is no raw HTML, source URLs are
 * absolute, and an image reference has alt text.
 *
 * It intentionally does NOT re-implement the numeric limits (title length, SEO
 * description bounds, ...). Those live once in src/lib/content/schema.ts and are
 * enforced by `next build`, which is the authoritative gate. Duplicating the
 * numbers here would create exactly the drift this project has been bitten by
 * before.
 *
 * Purpose: give CI a sub-second failure for the common mistakes, before paying
 * for a full production build.
 *
 * Exit 0 = structurally sound. Exit 1 = at least one problem, all listed.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "he"];
const CONTENT_ROOT = join(process.cwd(), "content");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const REQUIRED_KEYS = [
  "title", "slug", "locale", "excerpt", "seoDescription",
  "publishedAt", "canonicalUrl",
];

const problems = [];
let checked = 0;

function problem(file, msg) {
  problems.push(`${file}: ${msg}`);
}

/** Top-level frontmatter keys and their raw scalar text (indent 0 only). */
function topLevelKeys(head) {
  const out = new Map();
  for (const line of head.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
}

function unquote(v) {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return t;
}

for (const locale of LOCALES) {
  const dir = join(CONTENT_ROOT, locale);
  if (!existsSync(dir)) continue;

  const seen = new Map();

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const rel = `content/${locale}/${file}`;
    checked += 1;

    const raw = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");

    if (!raw.startsWith("---\n")) {
      problem(rel, "must start with a `---` frontmatter block");
      continue;
    }
    const end = raw.indexOf("\n---\n", 3);
    if (end === -1) {
      problem(rel, "frontmatter block is not closed with `---`");
      continue;
    }

    const head = raw.slice(4, end);
    const body = raw.slice(end + 5).trim();
    const keys = topLevelKeys(head);

    for (const key of REQUIRED_KEYS) {
      if (!keys.has(key)) problem(rel, `missing required frontmatter key \`${key}\``);
    }

    const slug = unquote(keys.get("slug"));
    if (slug && !SLUG_RE.test(slug)) problem(rel, `slug "${slug}" must be lowercase kebab-case`);
    if (slug && file !== `${slug}.md`) problem(rel, `filename must match the slug (expected "${slug}.md")`);
    if (slug) {
      if (seen.has(slug)) problem(rel, `duplicate slug "${slug}" (also in ${seen.get(slug)})`);
      else seen.set(slug, file);
    }

    const fmLocale = unquote(keys.get("locale"));
    if (fmLocale && fmLocale !== locale) {
      problem(rel, `frontmatter locale "${fmLocale}" does not match directory "${locale}"`);
    }

    for (const dateKey of ["publishedAt", "updatedAt"]) {
      const v = unquote(keys.get(dateKey));
      if (v && !DATE_RE.test(v)) problem(rel, `\`${dateKey}\` must be YYYY-MM-DD (got "${v}")`);
    }

    const featuredImage = unquote(keys.get("featuredImage"));
    const imageAlt = unquote(keys.get("imageAlt"));
    if (featuredImage && featuredImage !== "null") {
      if (!featuredImage.startsWith("/images/blog/")) {
        problem(rel, "`featuredImage` must live under /images/blog/");
      }
      if (!imageAlt) problem(rel, "`imageAlt` is required whenever `featuredImage` is set");
    }

    if (!body) problem(rel, "body is empty");
    if (/<\s*[a-zA-Z][^>]*>/.test(body)) problem(rel, "body must not contain raw HTML tags");

    // Source urls, wherever they appear in the frontmatter block.
    for (const m of head.matchAll(/^\s*url:\s*(.+)$/gm)) {
      const url = unquote(m[1]);
      if (url && !/^https?:\/\//i.test(url)) problem(rel, `source url must be absolute http(s) (got "${url}")`);
    }

    // Secret scan on content that is about to become world-readable.
    const secrets = [
      [/sk-ant-[A-Za-z0-9_-]{10,}/, "an Anthropic API key"],
      [/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/, "a GitHub token"],
      [/\bgithub_pat_[A-Za-z0-9_]{20,}/, "a GitHub fine-grained token"],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
      [/[A-Za-z]:\\{1,2}Users\\{1,2}/, "a Windows machine path"],
      [/\/(?:home|Users)\/[A-Za-z0-9._-]+\//, "a POSIX home path"],
    ];
    for (const [re, what] of secrets) {
      if (re.test(raw)) problem(rel, `contains what looks like ${what} — this repository is PUBLIC`);
    }
  }
}

if (problems.length) {
  console.error(`\n✗ Content validation failed (${problems.length} problem(s)):\n`);
  for (const p of problems) console.error(`  → ${p}`);
  console.error(
    `\n  Fix the source files. Do not relax the schema to make CI pass.` +
      `\n  Numeric limits (title/SEO/alt lengths) are enforced by \`next build\`.\n`
  );
  process.exit(1);
}

console.log(`✓ Content structurally valid (${checked} article file(s) checked).`);
