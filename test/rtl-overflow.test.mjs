// Guards against CSS patterns that open a horizontal scroll area, with an
// emphasis on the ones that are invisible in LTR and only bite under dir="rtl".
//
// Motivating regression: ContactForm's honeypot used `left: "-9999px"` to hide
// itself. Absolutely positioned against the initial containing block, that is
// outside the scrollable region in LTR (harmless) but *inside* it in RTL — so
// every Hebrew page carrying the contact form scrolled 9,999px sideways into
// blank white space, while every English page looked fine.
//
// These are source-level checks, so they run in `npm test` with no browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src", import.meta.url));
const REPO = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(full)) out.push(full);
    }
  })(ROOT);
  return out;
}

/**
 * Blanks out comments while preserving byte offsets and line numbering, so a
 * comment that merely *describes* a banned pattern doesn't trip the scan — and
 * offsets from the raw text still index into the stripped text.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (match, prefix) =>
      prefix + " ".repeat(match.length - prefix.length),
    );
}

const FILES = sourceFiles().map((path) => {
  const raw = readFileSync(path, "utf8");
  return {
    path,
    rel: relative(REPO, path).replace(/\\/g, "/"),
    raw,
    text: stripComments(raw),
  };
});

/** Collect `{file, line, text}` for every line matching `pattern`. */
function hits(pattern) {
  const found = [];
  for (const file of FILES) {
    file.text.split("\n").forEach((line, i) => {
      if (pattern.test(line)) found.push(`${file.rel}:${i + 1}  ${line.trim()}`);
    });
  }
  return found;
}

function assertNone(found, remedy) {
  assert.equal(found.length, 0, `${remedy}\n\n${found.join("\n")}\n`);
}

test("no off-canvas positioning via large negative left/right offsets", () => {
  assertNone(
    hits(/(?:^|[^-\w])(?:left|right)\s*:\s*["']?-\s*\d{3,}px/),
    "Hiding an element by pushing it thousands of pixels off-canvas opens a " +
      "scrollable strip in whichever direction the document flows. Use the " +
      "visually-hidden pattern instead (clip-path: inset(50%) + 1x1px + overflow: hidden).",
  );
});

test("no viewport-width units that ignore the scrollbar", () => {
  assertNone(
    hits(/\b(?:100vw|w-screen|min-w-screen|max-w-screen(?!-))/),
    "100vw includes the scrollbar gutter, so it overflows by the scrollbar " +
      "width on every desktop browser. Use 100% or w-full.",
  );
});

test("no physical left/right Tailwind spacing utilities in shared components", () => {
  // Physical utilities don't flip under RTL. Logical ones (ps-/pe-/ms-/me-)
  // do. `left-0`/`right-0` are exempt: the drawer deliberately pins to one
  // physical side in both directions.
  assertNone(
    hits(/\bclassName\s*[:=][^\n]*(?:^|[\s"'`])(?:-?(?:pl|pr|ml|mr)-(?:\d|px|auto))/),
    "Physical padding/margin utilities don't mirror under dir=\"rtl\". " +
      "Use the logical equivalents: ps-/pe-/ms-/me-.",
  );
});

test("the contact honeypot stays inside the document box", () => {
  const form = FILES.find((f) => f.rel.endsWith("src/components/ContactForm.tsx"));
  assert.ok(form, "ContactForm.tsx not found");

  const honeypot = form.text.slice(
    form.raw.indexOf("const honeypot"),
    form.raw.indexOf("const consent"),
  );
  assert.ok(honeypot.length > 0, "honeypot field no longer found in ContactForm");

  assert.ok(
    /clipPath|clip-path/.test(honeypot),
    "The honeypot must be hidden with clip-path, not by moving it off-canvas.",
  );
  assert.equal(
    /(?:left|right|top|bottom)\s*:\s*["']?-/.test(honeypot),
    false,
    "The honeypot must not use negative offsets — that is the RTL overflow bug.",
  );
});
