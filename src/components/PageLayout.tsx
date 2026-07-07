import { createElement, Fragment } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale, type Locale } from "@/i18n/config";

export function PageLayout({
    children,
    locale = defaultLocale,
}: {
    children: React.ReactNode;
    locale?: Locale;
}) {
    // For the default locale, pass no dictionary so Header/Footer use their
  // existing English content (zero-risk, unchanged behavior). For other
  // locales, pass the localized dictionary.
  const dictionary = locale === defaultLocale ? undefined : getDictionary(locale);

  return createElement(
Fragment,
    null,
        createElement(Header, { dictionary }),
        createElement("main", null, children),
        createElement(Footer, { dictionary })
      );
}
