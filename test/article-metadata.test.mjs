// Guards the article frontmatter fields that reach a search result page.
//
// These are hand-authored per article, in two languages, and nothing else
// checks them. The English kiosk guide shipped a title that rendered at 65
// characters — past the point where Google replaces the end of the headline
// with an ellipsis — because the brand suffix was appended unconditionally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = fileURLToPath(new URL("../content", import.meta.url));
const REPO = fileURLToPath(new URL("..", import.meta.url));

// Mirrors articleMetadata in src/lib/content/metadata.ts. A seoTitle longer
// than this cannot be rescued by dropping the brand, so it must be shortened.
const TITLE_BUDGET = 60;

// Google renders roughly this much of a description before truncating.
const DESCRIPTION_BUDGET = 160;

function articles() {
  const out = [];
  for (const locale of readdirSync(CONTENT)) {
    const dir = join(CONTENT, locale);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      out.push(join(dir, file));
    }
  }
  return out;
}

/** Reads a single scalar out of the YAML frontmatter block. */
function frontmatter(source, key) {
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return null;
  const line = block[1].match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!line) return null;
  return line[1].trim().replace(/^["'](.*)["']$/, "$1");
}

test("every article title fits in a search result", () => {
  const tooLong = [];
  for (const file of articles()) {
    const source = readFileSync(file, "utf8");
    const seoTitle = frontmatter(source, "seoTitle");
    const rel = relative(REPO, file).replace(/\\/g, "/");

    assert.ok(seoTitle, `${rel} has no seoTitle`);
    if (seoTitle.length > TITLE_BUDGET) {
      tooLong.push(`${rel}: ${seoTitle.length} chars — "${seoTitle}"`);
    }
  }
  assert.deepEqual(tooLong, [], `Shorten to ${TITLE_BUDGET} characters or fewer:\n  ${tooLong.join("\n  ")}`);
});

test("every article has a description that will not be truncated", () => {
  const problems = [];
  for (const file of articles()) {
    const source = readFileSync(file, "utf8");
    const desc = frontmatter(source, "seoDescription");
    const rel = relative(REPO, file).replace(/\\/g, "/");

    if (!desc) { problems.push(`${rel}: no seoDescription`); continue; }
    if (desc.length > DESCRIPTION_BUDGET) problems.push(`${rel}: ${desc.length} chars`);
  }
  assert.deepEqual(problems, [], `Descriptions must be under ${DESCRIPTION_BUDGET} characters:\n  ${problems.join("\n  ")}`);
});

test("the brand suffix is applied conditionally, not unconditionally", () => {
  // The bug was a template literal that always appended the brand. If that
  // pattern returns, titles silently grow past the budget again and only a
  // production sweep would catch it.
  const metadata = readFileSync(
    fileURLToPath(new URL("../src/lib/content/metadata.ts", import.meta.url)),
    "utf8",
  );
  assert.match(metadata, /withBrand\(/, "articleMetadata should route its title through withBrand");
  assert.doesNotMatch(
    metadata,
    /title:\s*`\$\{article\.seoTitle\}/,
    "the article title is being concatenated with a suffix unconditionally again",
  );
});
