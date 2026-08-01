/**
 * Blog UI strings, per locale.
 *
 * Kept local to the article system rather than added to the shared i18n
 * dictionaries: the article system is self-contained and the existing
 * Dictionary type is consumed by unrelated pages we must not disturb.
 */

import type { Locale } from "@/i18n/config";

export type BlogStrings = {
  blog: string;
  eyebrow: string;
  indexTitle: string;
  indexIntro: string;
  readingTime: (m: number) => string;
  readMore: string;
  published: string;
  updated: string;
  sources: string;
  sourcesNote: string;
  backToBlog: string;
  empty: string;
  draftBadge: string;
  imagePending: string;
};

const en: BlogStrings = {
  blog: "Blog",
  eyebrow: "Insights",
  indexTitle: "Restaurant operations, made simpler",
  indexIntro:
    "Practical guides for quick-service operators — ordering, kiosks, kitchen flow, and the numbers behind them.",
  readingTime: (m) => `${m} min read`,
  readMore: "Read the article",
  published: "Published",
  updated: "Updated",
  sources: "Sources",
  sourcesNote: "External references used while researching this article.",
  backToBlog: "Back to all articles",
  empty: "No articles published yet.",
  draftBadge: "Draft",
  imagePending: "Cover image pending",
};

const he: BlogStrings = {
  blog: "בלוג",
  eyebrow: "תובנות",
  indexTitle: "תפעול מסעדות, פשוט יותר",
  indexIntro:
    "מדריכים פרקטיים למפעילי מסעדות מהיר — הזמנות, עמדות שירות עצמי, זרימת מטבח והמספרים שמאחוריהם.",
  readingTime: (m) => `${m} דקות קריאה`,
  readMore: "לקריאת המאמר",
  published: "פורסם",
  updated: "עודכן",
  sources: "מקורות",
  sourcesNote: "מקורות חיצוניים ששימשו במחקר למאמר זה.",
  backToBlog: "חזרה לכל המאמרים",
  empty: "טרם פורסמו מאמרים.",
  draftBadge: "טיוטה",
  imagePending: "תמונת נושא בהכנה",
};

export function getBlogStrings(locale: Locale): BlogStrings {
  return locale === "he" ? he : en;
}
