import type { Metadata } from "next";
import { poppins } from "@/app/_shared/fonts";
import { localeMetadata } from "@/app/_shared/locale-metadata";
import SiteScripts from "@/app/_shared/SiteScripts";
import { localeDirection } from "@/i18n/config";
import "../globals.css";

// Root layout for the Hebrew route group. `lang`/`dir` are static constants, so
// every /he/** page is server-rendered with lang="he" dir="rtl" (for crawlers
// and no-JS) AND stays statically generated. The "(he)" group is invisible in
// the URL, so paths, canonical, hreflang and sitemap are unchanged.
export const metadata: Metadata = localeMetadata("he");

export default function HeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir={localeDirection.he} className={poppins.variable}>
      <body>
        <SiteScripts />
        {children}
      </body>
    </html>
  );
}
