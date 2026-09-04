// The skip link is the difference between reaching a page's content on the
// first Tab and on the eighteenth. It is easy to break without noticing,
// because nothing about the page looks wrong when it stops working — it is
// invisible until focused, so a regression is silent to everyone who uses a
// mouse.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/**
 * Blanks comments while keeping the byte offsets, so a comment that names a
 * banned pattern in order to explain why it is banned does not trip the scan.
 * The first version of the last test in this file failed on clean code for
 * exactly that reason — it found "sr-only" in the note saying not to use it.
 */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, p) => p + " ".repeat(m.length - p.length));

const layout = read("../src/components/PageLayout.tsx");
const component = read("../src/components/SkipLink.tsx");
const css = read("../src/app/globals.css");

test("the skip link is the first thing in the layout", () => {
  const skipAt = layout.indexOf("SkipLink");
  const headerAt = layout.indexOf("createElement(Header");
  assert.ok(skipAt !== -1, "PageLayout must render SkipLink");
  assert.ok(
    skipAt < headerAt,
    "SkipLink must come before Header in the DOM, or Tab reaches the menu first and the link is pointless",
  );
});

test("the target exists and can actually receive focus", () => {
  assert.match(layout, /id: "main"/, "<main> needs the id the link points at");
  // Without tabIndex -1 the browser moves the scroll position but leaves focus
  // in the navigation, so the next Tab goes back to the menu.
  assert.match(layout, /tabIndex: -1/, "<main> must be focusable for the jump to move focus, not just scroll");
  assert.match(component, /href: "#main"/);
});

test("it is hidden by clipping, never by a large negative offset", () => {
  // A -9999px inset sits outside the scrollable area in LTR and inside it under
  // dir="rtl". That is the exact bug that once put 9,999px of blank white space
  // beside every Hebrew page.
  const block = css.slice(css.indexOf(".skip-link"));
  assert.doesNotMatch(
    block.slice(0, 600),
    /-\d{3,}px/,
    "hide the skip link with clip, not with a large negative offset",
  );
  assert.match(block, /clip-path:\s*inset\(50%\)/);
});

test("the focused state is visible, reachable and big enough to hit", () => {
  const focus = css.slice(css.indexOf(".skip-link:focus"), css.indexOf(".skip-link:focus") + 700);
  assert.match(focus, /position:\s*fixed/, "it has to leave the flow to be seen");
  assert.match(focus, /clip-path:\s*none/, "the clip must be released or it stays a 1px box");
  assert.match(focus, /min-height:\s*2\.75rem/, "44px is the touch-target floor");
  // Logical, so it lands on the right in Hebrew and the left in English rather
  // than needing two rules.
  assert.match(focus, /inset-inline-start/, "use the logical property so RTL flips without a second rule");
  assert.doesNotMatch(focus, /(^|[^-])left:/, "a physical left offset would put it on the wrong side in Hebrew");
});

test("it is styled by a class, not by utilities that can silently vanish", () => {
  // The first attempt used `sr-only focus:not-sr-only focus:inset-inline-start-4`.
  // That last utility does not exist, so it emitted no CSS at all, and `sr-only`
  // kept winning the position — the link stayed a 1x1 pixel while focused and
  // the build passed without a word.
  const code = stripComments(component);
  assert.match(code, /className: "skip-link"/);
  assert.doesNotMatch(code, /sr-only/, "the styling belongs in globals.css where it cannot be silently dropped");
});
