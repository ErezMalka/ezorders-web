"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname, localeDirection } from "@/i18n/config";

/**
 * Keeps the document root's lang/dir in step with the active locale during
 * CLIENT-SIDE navigation. The server already renders the correct
 * `<html lang dir>` for the first paint (see RootLayout), so this only has to
 * update it when the user soft-navigates between an /en and an /he route — the
 * root layout itself does not re-render on navigation. Runs after hydration, so
 * it never causes a hydration mismatch.
 */
export default function LocaleHtmlSync() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = localeFromPathname(pathname);
    const html = document.documentElement;
    if (html.getAttribute("lang") !== locale) html.setAttribute("lang", locale);
    const dir = localeDirection[locale];
    if (html.getAttribute("dir") !== dir) html.setAttribute("dir", dir);
  }, [pathname]);

  return null;
}
