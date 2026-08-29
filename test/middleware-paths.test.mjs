// The two lists in middleware.ts have to agree.
//
// `config.matcher` decides whether the middleware runs for a path at all;
// LEGACY_EN_PATHS decides what it does once it has. A path in the second but
// not the first is silently inert — the redirect is written, looks right in
// review, and the URL still 404s. That is exactly what happened to /blog:
// Search Console reported it as the site's only 404, the redirect was added,
// and it kept 404ing because the matcher was never updated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  fileURLToPath(new URL("../src/middleware.ts", import.meta.url)),
  "utf8",
);

/** Reads the string literals out of a named array, ignoring comments. */
function arrayLiteral(marker) {
  const start = src.indexOf(marker);
  assert.ok(start >= 0, `${marker} not found in middleware.ts`);
  const open = src.indexOf("[", start);
  const close = src.indexOf("]", open);
  const body = src
    .slice(open, close)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("every legacy path the middleware redirects is one it actually runs on", () => {
  const legacy = arrayLiteral("const LEGACY_EN_PATHS");
  const matcher = arrayLiteral("matcher:");

  const inert = legacy.filter((p) => !matcher.includes(p));
  assert.deepEqual(
    inert,
    [],
    "These paths are in LEGACY_EN_PATHS but missing from config.matcher, so " +
      "the middleware never runs for them and they will 404 despite the " +
      "redirect being written. Add them to the matcher too.",
  );
});

test("the matcher lists nothing the middleware has no reason to run on", () => {
  const legacy = arrayLiteral("const LEGACY_EN_PATHS");
  const matcher = arrayLiteral("matcher:");

  // The middleware has two jobs, so a matcher entry is justified by either.
  // "/" is the locale redirect; the agent prefix is the Supabase session
  // refresh, which is why it is matched despite having no redirect rule.
  const unused = matcher.filter(
    (p) => p !== "/" && !p.startsWith("/he/agent") && !legacy.includes(p),
  );

  assert.deepEqual(
    unused,
    [],
    "These paths run the middleware but neither redirect nor refresh a " +
      "session — either a rule was removed and the matcher entry left behind, " +
      "or a rule is missing.",
  );
});
