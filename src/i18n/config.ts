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
