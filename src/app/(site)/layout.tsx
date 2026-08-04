import type { Metadata } from "next";
import { poppins } from "@/app/_shared/fonts";
import { baseMetadata } from "@/app/_shared/site-metadata";
import SiteScripts from "@/app/_shared/SiteScripts";
import { localeDirection } from "@/i18n/config";
import "../globals.css";

// Root layout for non-locale-prefixed routes (the /connected page and the global
// not-found). These default to English document language, matching the previous
// behaviour. Static like the others.
export const metadata: Metadata = baseMetadata;

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir={localeDirection.en} className={poppins.variable}>
      <body>
        <SiteScripts />
        {children}
      </body>
    </html>
  );
}
