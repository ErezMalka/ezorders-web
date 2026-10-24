import type { FaqItem } from "./faq";

/**
 * Questions and answers the EZOrders growth autopilot adds to individual pages.
 *
 * WHY A FILE OF ITS OWN. The FAQ sets in ./faq.ts are shared — GENERAL_FAQ renders on a dozen
 * pages — so an answer added there would change all of them at once and no page could be
 * measured. Here every page has its own list, keyed by its address, and a page shows it only
 * where its code calls `autoFaq("<its address>")`. One answer changes exactly one page.
 *
 * WHERE THE ANSWERS COME FROM. Each one is written from sentences already published on this
 * site, checked word for word against them and then by a second reader that sees only those
 * passages. An answer that needs a fact the site does not state is never written. The pull
 * request that adds an answer quotes the passages it rests on.
 *
 * The JSON between the two marker lines is rewritten whole by the autopilot
 * (ezorders-growth-os, src/growth/auto-faq-file.js). Keep the markers and the declaration line
 * exactly as they are; anything outside them is never touched.
 */
// AUTO-FAQ:BEGIN — written by the growth autopilot
export const AUTO_FAQ: Record<string, FaqItem[]> = {};
// AUTO-FAQ:END

/** The automatic answers for one page, or none. */
export function autoFaq(path: string): FaqItem[] {
  return AUTO_FAQ[path] ?? [];
}
