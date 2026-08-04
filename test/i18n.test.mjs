// Locale/direction resolution tests (both locales). Run with Node's built-in
// type stripping so the TS source is imported directly, no build step.
//   npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { localeFromPathname, localeDirection, locales } from "../src/i18n/config.ts";

test("English routes resolve to en", () => {
  for (const p of ["/en", "/en/", "/en/pos", "/en/blog/restaurant-self-order-kiosk-software", "/", "/connected"]) {
    assert.equal(localeFromPathname(p), "en", p);
  }
});

test("Hebrew routes resolve to he", () => {
  for (const p of ["/he", "/he/", "/he/pos", "/he/blog/restaurant-self-order-kiosk-software"]) {
    assert.equal(localeFromPathname(p), "he", p);
  }
});

test("a path that merely starts with the letters 'he' is not Hebrew", () => {
  for (const p of ["/help", "/herd", "/the-help", "/health"]) {
    assert.equal(localeFromPathname(p), "en", p);
  }
});

test("direction map: en=ltr, he=rtl", () => {
  assert.equal(localeDirection.en, "ltr");
  assert.equal(localeDirection.he, "rtl");
});

test("both supported locales are declared", () => {
  assert.deepEqual([...locales].sort(), ["en", "he"]);
});
