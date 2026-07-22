import { createElement, Fragment } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale, type Locale } from "@/i18n/config";

export function PageLayout({
    children,
    locale = defaultLocale,
}: {
    children?: React.ReactNode;
    locale?: Locale;
}) {
    const dictionary = locale === defaultLocale ? undefined : getDictionary(locale);

return createElement(
    Fragment,
    null,
    createElement(Header, { dictionary, locale }),
    createElement("main", null, children),
    createElement(Footer, { dictionary })
    );
}
