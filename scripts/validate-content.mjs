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
/** Collected across locales so translation pairs can be cross-checked at the end. */
const allArticles = [];

/**
 * Content Quality Gate — structural checks, mirrored from the authoritative
 * implementation in ezorders-growth-os/src/export/quality-gate.js.
 *
 * Language-agnostic by design: no rule may depend on English word lists or
 * Latin script, or it silently stops protecting Hebrew content.
 *
 * Fenced code blocks are flagged rather than dropped, so a section whose only
 * content is a code block is not mistaken for an empty one.
 */
function qualityProblems(body, locale) {
  const found = [];
  const raw = body.split("\n");
  const lines = [];
  let inFence = false;
  for (let i = 0; i < raw.length; i++) {
    if (/^\s*(```|~~~)/.test(raw[i])) {
      inFence = !inFence;
      lines.push({ n: i + 1, text: raw[i], fenced: true });
      continue;
    }
    lines.push({ n: i + 1, text: raw[i], fenced: inFence });
  }
  const prose = lines.filter((l) => !l.fenced);

  const hs = prose
    .map((l) => {
      const m = l.text.match(/^(#{1,6})\s+(.*)$/);
      return m ? { n: l.n, level: m[1].length, text: m[2].trim() } : null;
    })
    .filter(Boolean);

  for (const h of hs) {
    if (h.level === 1) found.push(`[no-h1-in-body] line ${h.n}: body contains an H1 ("${h.text}")`);
  }

  let prev = 1;
  for (const h of hs) {
    if (h.level > prev + 1) {
      found.push(`[heading-level-skip] line ${h.n}: jumps from H${prev} to H${h.level} ("${h.text}")`);
    }
    prev = h.level;
  }

  const first = prose.find((l) => l.text.trim() !== "");
  if (first && /^#{1,6}\s/.test(first.text)) {
    found.push(`[no-intro] line ${first.n}: body starts with a heading`);
  }

  for (let i = 0; i < hs.length - 1; i++) {
    const between = lines.filter((l) => l.n > hs[i].n && l.n < hs[i + 1].n && l.text.trim() !== "");
    if (between.length === 0) found.push(`[empty-section] line ${hs[i].n}: "${hs[i].text}" has no content`);
  }

  const words = body.split(/\s+/).filter(Boolean).length;
  const h2s = hs.filter((h) => h.level === 2);
  if (words >= 600 && h2s.length < 2) {
    found.push(`[insufficient-structure] ${words} words with only ${h2s.length} H2 heading(s)`);
  }

  const seen = new Set();
  for (const h of hs) {
    const key = h.text.toLowerCase();
    if (seen.has(key)) found.push(`[duplicate-heading] line ${h.n}: "${h.text}" appears more than once`);
    seen.add(key);
  }

  for (const l of prose) {
    if (/\b(lorem ipsum|TODO|TBD|FIXME|XXX|PLACEHOLDER)\b/i.test(l.text)) {
      found.push(`[placeholder-text] line ${l.n}: unfinished placeholder text`);
    }
    if (/!\[[^\]]*\]\([^)]*\)/.test(l.text)) {
      found.push(`[body-image-unsupported] line ${l.n}: body images are not supported`);
    }

    const linkRe = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m;
    while ((m = linkRe.exec(l.text)) !== null) {
      const text = m[1].trim();
      const href = m[2].trim();
      if (!text) {
        found.push(`[empty-link-text] line ${l.n}: link to ${href} has no text`);
        continue;
      }
      if (/^(click here|here|read more|this|link|more)$/i.test(text)) {
        found.push(`[non-descriptive-link] line ${l.n}: link text "${text}"`);
      }
      if (/^https?:\/\//i.test(text)) {
        found.push(`[bare-url-link-text] line ${l.n}: raw URL used as link text`);
      }
      if (href.startsWith("/") && !href.startsWith(`/${locale}/`)) {
        found.push(`[internal-link-locale] line ${l.n}: "${href}" is not prefixed with /${locale}/`);
      } else if (!href.startsWith("/") && !/^https?:\/\//i.test(href) && !href.startsWith("#")) {
        found.push(`[invalid-link-href] line ${l.n}: "${href}"`);
      }
    }
  }

  return found;
}

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

    // --- Content Quality Gate (receiving side) ---------------------------
    //
    // The authoritative gate lives in ezorders-growth-os
    // (src/export/quality-gate.js) and refuses to EXPORT a failing article.
    // These are the same structural rules re-checked here, because an article
    // file can also be hand-edited directly in this repository, which never
    // passes through the exporter. Both sides must hold for content to ship.
    for (const p of qualityProblems(body, locale)) problem(rel, p);

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

    // Record for the cross-locale translation checks below.
    allArticles.push({
      rel,
      locale,
      slug,
      translationKey: unquote(keys.get("translationKey")) || slug,
      translationOf: unquote(keys.get("translationOf")),
      sourceUpdatedAt: unquote(keys.get("sourceUpdatedAt")),
      updatedAt: unquote(keys.get("updatedAt")) || unquote(keys.get("publishedAt")),
    });
  }
}

// ---------------------------------------------------------------------------
// Cross-locale translation integrity
// ---------------------------------------------------------------------------
//
// A partially translated site is a NORMAL state and is not an error. A
// CONTRADICTORY one is: a translation pointing at a source that does not exist,
// two articles in one locale claiming the same key, or a translation whose
// source has moved on since it was made.

const byKey = new Map();
for (const a of allArticles) {
  if (!a.translationKey) continue;
  const list = byKey.get(a.translationKey) ?? [];
  list.push(a);
  byKey.set(a.translationKey, list);
}

for (const [key, group] of byKey) {
  const seenLocales = new Set();
  for (const a of group) {
    if (seenLocales.has(a.locale)) {
      problem(a.rel, `translationKey "${key}" is used more than once in locale "${a.locale}"`);
    }
    seenLocales.add(a.locale);
  }

  for (const a of group) {
    if (!a.translationOf || a.translationOf === "null") continue;

    if (a.translationOf === a.locale) {
      problem(a.rel, "`translationOf` cannot equal the article's own locale");
      continue;
    }
    if (!a.sourceUpdatedAt || a.sourceUpdatedAt === "null") {
      problem(a.rel, "`sourceUpdatedAt` is required when `translationOf` is set (needed for stale detection)");
      continue;
    }

    const source = group.find((s) => s.locale === a.translationOf);
    if (!source) {
      problem(
        a.rel,
        `declares translationOf "${a.translationOf}" but no ${a.translationOf} article shares translationKey "${key}"`
      );
      continue;
    }
    if (source.updatedAt && source.updatedAt > a.sourceUpdatedAt) {
      problem(
        a.rel,
        `STALE translation: made from ${source.locale} @ ${a.sourceUpdatedAt}, but ${source.rel} was updated ${source.updatedAt}`
      );
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
