import { createElement, Fragment } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { SkipLink } from "./SkipLink";
import { AccessibilityWidget } from "./AccessibilityWidget";
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
    // First in the DOM so it is the first thing Tab reaches.
    createElement(SkipLink, { locale }),
    createElement(Header, { dictionary, locale }),
    // tabIndex -1 so following the skip link actually moves focus here, not
    // just the scroll position — without it the next Tab returns to the nav.
    createElement("main", { id: "main", tabIndex: -1 }, children),
    createElement(Footer, { dictionary }),
    // Last in the DOM: a floating control, reached after the page content.
    createElement(AccessibilityWidget, { locale })
    );
}
