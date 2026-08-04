import type { Metadata } from "next";
import { poppins } from "@/app/_shared/fonts";
import { baseMetadata } from "@/app/_shared/site-metadata";
import SiteScripts from "@/app/_shared/SiteScripts";
import { localeDirection } from "@/i18n/config";
import "../globals.css";

// Root layout for the English route group. Because this is a per-locale ROOT
// layout, `lang`/`dir` are static constants — so every /en/** page is rendered
// with lang="en" dir="ltr" in the server HTML AND stays statically generated.
// URLs are unaffected: the "(en)" group segment does not appear in the path.
export const metadata: Metadata = baseMetadata;

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir={localeDirection.en} className={poppins.variable}>
      <body>
        <SiteScripts />
        {children}
      </body>
    </html>
  );
}
