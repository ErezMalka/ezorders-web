import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { en } from "@/i18n/dictionaries/en";
import { he } from "@/i18n/dictionaries/he";

const dictionaries: Record<Locale, Dictionary> = {
    en,
    he,
};

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale];
}
