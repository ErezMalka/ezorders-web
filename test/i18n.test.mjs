// Locale/direction unit tests (both locales). Run with Node's built-in type
// stripping so the TS source is imported directly, no build step.  npm test
//
// The document lang/dir is set statically by the per-locale root layouts
// (app/(en)/layout.tsx, app/(he)/layout.tsx) from `localeDirection`; these tests
// pin that mapping. End-to-end lang/dir of the built HTML is verified separately
// against the production build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { localeDirection, locales, isLocale } from "../src/i18n/config.ts";

test("both supported locales are declared", () => {
  assert.deepEqual([...locales].sort(), ["en", "he"]);
});

test("English is LTR", () => {
  assert.equal(localeDirection.en, "ltr");
});

test("Hebrew is RTL", () => {
  assert.equal(localeDirection.he, "rtl");
});

test("isLocale accepts en/he and rejects others", () => {
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("he"), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale(""), false);
});
