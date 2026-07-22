"use client";

import { useEffect } from "react";
import { localeDirection } from "@/i18n/config";

/**
 * Hebrew is the site's default locale. Next.js renders a single <html> element
 * from the root layout, so this locale layout promotes the document to
 * lang="he" / dir="rtl" at the document level for every /he route, and restores
 * lang="en" / dir="ltr" when the user navigates away to an English route.
 *
 * The inner wrapper keeps the content visually RTL during SSR / first paint.
 */
export default function HeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.getAttribute("lang");
    const prevDir = html.getAttribute("dir");

    html.setAttribute("lang", "he");
    html.setAttribute("dir", localeDirection.he);

    return () => {
      html.setAttribute("lang", prevLang ?? "en");
      html.setAttribute("dir", prevDir ?? "ltr");
    };
  }, []);

  return (
    <div lang="he" dir={localeDirection.he}>
      {children}
    </div>
  );
}
