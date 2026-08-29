import { createElement } from "react";
import type { Locale } from "@/i18n/config";

/**
 * "Skip to content" — the first thing in the tab order on every page.
 *
 * Measured before adding it: 18 tab stops between landing on a page and
 * reaching its content, because the header carries the full product menu. A
 * keyboard user paid that on every navigation, and a screen reader user heard
 * the same nine menu items read out before the page said anything new. WCAG
 * 2.4.1 Bypass Blocks is Level A — the floor, not a refinement.
 *
 * Hidden until focused rather than hidden outright: a skip link that never
 * becomes visible is no use to a sighted keyboard user, who needs to see where
 * the focus went. The styling lives in globals.css as plain CSS — the first
 * attempt used Tailwind utilities and silently produced a 1x1 pixel, because
 * one class did not exist and `sr-only` kept winning the position.
 */

const LABEL: Record<Locale, string> = {
  he: "דילוג לתוכן",
  en: "Skip to content",
};

export function SkipLink({ locale = "he" }: { locale?: Locale }) {
  return createElement(
    "a",
    {
      href: "#main",
      className: "skip-link",
    },
    LABEL[locale],
  );
}
