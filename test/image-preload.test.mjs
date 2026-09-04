// Guards the cost of React's automatic image preloading.
//
// React emits `<link rel="preload" as="image">` for every <img> it renders on
// the server that does not carry `loading="lazy"`. For a hero that is exactly
// right. For anything further down the page it is a bandwidth tax collected at
// the worst possible moment — the browser fetches it at high priority while the
// content above the fold is still painting.
//
// Motivating regression: the SampleApps carousel is the seventh section on the
// home page and its <img> had no `loading` attribute, so every visit preloaded
// benefits-app.png — 328KB, the largest file on the site — before the hero had
// finished. The fix is one attribute, and nothing about the source looks wrong
// without knowing this rule, which is why it needs a test rather than a comment.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));
const REPO = fileURLToPath(new URL("..", import.meta.url));

/** Files whose preload is deliberate: the image is the first thing on screen. */
const ABOVE_THE_FOLD = new Set([
  "src/app/(he)/he/solutions/page.tsx", // page hero
  "src/app/(he)/he/about/page.tsx", // page hero; the four pillar images below it are lazy
  "src/components/article/ArticlePage.tsx", // featured image, top of article
  "src/components/ProductPageLayout.tsx", // product hero
  "src/components/sections/Services.tsx", // section 2, four small icons
  // Paid-traffic landing pages. The hero shot is genuinely the first thing on
  // screen and is deliberately eager. Its src comes from the page's content
  // object rather than a literal, so the scan below cannot tell which asset the
  // eager tag names and falls back to reporting every asset in the file — the
  // channel strip included, which is already lazy.
  "src/components/landing/LandingPage.tsx",
]);

/**
 * Bytes above which preloading a below-the-fold image is worth failing over.
 * Small icons cost little and are often genuinely near the top; a file this
 * size competing with the hero is never an accident worth keeping.
 */
const HEAVY_BYTES = 40 * 1024;

function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx$/.test(full)) out.push(full);
    }
  })(SRC);
  return out;
}

const rel = (f) => relative(REPO, f).replace(/\\/g, "/");

/** Every <img …/> tag and createElement("img", {…}) call, and whether it is lazy. */
function imageTags(source) {
  const tags = [];
  for (const m of source.matchAll(/<img\b[\s\S]*?\/>/g)) {
    tags.push({ text: m[0], lazy: /loading=\{?["']lazy/.test(m[0]) });
  }
  for (const m of source.matchAll(/createElement\(\s*"img"\s*,\s*\{[^}]*\}/g)) {
    tags.push({ text: m[0], lazy: /loading:\s*"lazy"/.test(m[0]) });
  }
  return tags;
}


/**
 * Asset paths named anywhere in the file.
 *
 * Deliberately not tied to the src attribute: the carousel that caused this
 * whole thing writes `src={sampleApps[index].image}` and keeps the paths in an
 * array above, so matching only `src="…"` scored it clean. Any heavy asset the
 * file mentions is treated as one the file's <img> tags might render.
 */
function assetsNamed(source) {
  return [...source.matchAll(/["'`](\/(?:images|icons)\/[^"'`]+)["'`]/g)].map((m) => m[1]);
}

test("no heavy image is auto-preloaded from below the fold", () => {
  const offenders = [];

  for (const file of sourceFiles()) {
    if (ABOVE_THE_FOLD.has(rel(file))) continue;

    const source = readFileSync(file, "utf8");
    const tags = imageTags(source);
    if (tags.length === 0 || tags.every((t) => t.lazy)) continue;

    for (const src of new Set(assetsNamed(source))) {
      const asset = join(PUBLIC, src);
      if (!existsSync(asset)) continue;

      const bytes = statSync(asset).size;
      if (bytes > HEAVY_BYTES) {
        offenders.push(`${rel(file)} renders ${src} (${Math.round(bytes / 1024)}KB) without loading="lazy"`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `React will preload these at high priority. Add loading="lazy", or list the ` +
      `file in ABOVE_THE_FOLD if the image really is the first thing on screen:\n  ` +
      offenders.join("\n  "),
  );
});

test("the hero animation does not carry uncompressed rasters", () => {
  // hero.json was 698KB, of which 512KB was PNG inlined as base64 — and base64
  // inflates already-compressed data by a third, so brotli could not recover
  // any of it. It was the single heaviest asset on the site, larger than all
  // the JavaScript combined, and invisible to any check that looks at images.
  //
  // The rasters are now WebP, chosen per asset: lossy for the photographic
  // layers, lossless for the flat artwork. Exporting a fresh animation from
  // After Effects or LottieFiles will reintroduce PNG, which is why this is a
  // test rather than a note.
  const file = fileURLToPath(new URL("../public/animations/hero.json", import.meta.url));
  const source = readFileSync(file, "utf8");

  const png = (source.match(/data:image\/png;base64,/g) || []).length;
  assert.equal(png, 0, `${png} PNG rasters are inlined in hero.json — re-encode them as WebP`);

  const kb = Math.round(statSync(file).size / 1024);
  assert.ok(kb <= 300, `hero.json is ${kb}KB; it downloads on every home-page visit`);
});

test("the images the home page carries are all reasonably sized", () => {
  // The four PNG screenshots that used to sit here totalled 737KB and were
  // served unoptimised, because these are plain <img> tags rather than
  // next/image. Nothing regenerates them, so the sizes are worth pinning.
  const oversized = [];
  for (const name of ["benefits-app", "website-hero", "solutions-chef", "app-hero"]) {
    const webp = join(PUBLIC, "images", `${name}.webp`);
    assert.ok(existsSync(webp), `${name}.webp is missing — was it reverted to PNG?`);
    const kb = Math.round(statSync(webp).size / 1024);
    if (kb > 120) oversized.push(`${name}.webp is ${kb}KB`);
  }
  assert.deepEqual(oversized, [], `Re-encode before committing:\n  ${oversized.join("\n  ")}`);
});
