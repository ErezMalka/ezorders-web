// /he/kitchen-display answers three questions in its own body copy, and its
// FAQPage JSON-LD restates them from KDS_FAQ in src/data/faq.ts. FAQPage must
// describe text a visitor can actually see, so the two copies have to stay
// word-for-word identical. Nothing else would notice if one were edited alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

// The page's visible text: tags removed, whitespace collapsed, as a browser shows it.
const pageText = read("../src/app/(he)/he/kitchen-display/page.tsx")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ");

const faq = read("../src/data/faq.ts");
const kdsBlock = faq.slice(faq.indexOf("export const KDS_FAQ"));
const strings = [...kdsBlock.matchAll(/\b[qa]: "([^"]+)"/g)].map((m) => m[1]);

test("KDS_FAQ has the page's three questions and answers", () => {
  assert.equal(strings.length, 6);
});

for (const s of strings) {
  test(`kitchen-display shows: ${s.slice(0, 40)}`, () => {
    assert.ok(pageText.includes(s), "KDS_FAQ text must match the visible page copy exactly");
  });
}
