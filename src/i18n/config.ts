export const locales = ["en", "he"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
    en: "ltr",
    he: "rtl",
};

export function isLocale(value: string): value is Locale {
    return (locales as readonly string[]).includes(value);
}

/**
 * The active locale for a pathname. Hebrew lives under /he; everything else
 * (including the English tree under /en) is English. One definition, used by
 * both the server root layout and the client-side sync.
 */
export function localeFromPathname(pathname: string): Locale {
    return pathname === "/he" || pathname.startsWith("/he/") ? "he" : "en";
}
