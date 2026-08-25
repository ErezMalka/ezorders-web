export const locales = ["en", "he"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * The locale a search engine should fall back to when it cannot match the
 * visitor's own — the value of hreflang="x-default".
 *
 * Deliberately separate from `defaultLocale`. That one is the locale
 * PageLayout assumes when a caller passes none, and flipping it to "he" would
 * make `locale === defaultLocale` true for Hebrew, hand the Header an
 * undefined dictionary, and render English navigation on Hebrew pages.
 *
 * This constant answers a different question: what does "/" actually serve?
 * middleware.ts redirects "/" to "/he", so the honest answer is Hebrew. The
 * sitemap and the page-level hreflang used to disagree about this.
 */
export const xDefaultLocale: Locale = "he";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
    en: "ltr",
    he: "rtl",
};

export function isLocale(value: string): value is Locale {
    return (locales as readonly string[]).includes(value);
}
