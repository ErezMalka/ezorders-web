import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Google Tag Manager container id, e.g. "GTM-XXXXXXX".
// Set in Vercel env (Production + Preview) as NEXT_PUBLIC_GTM_ID.
// When unset, no tracking is injected (safe no-op).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const SITE_DESCRIPTION =
  "EZorders turns offline to online — POS, digital menus, online ordering, kiosk stands, loyalty and multi-branch management for modern restaurants.";

export const metadata: Metadata = {
  title: {
    default: "ezorders",
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL("https://ezorders.com"),
  applicationName: "EZOrders",
  keywords: [
    "restaurant ordering system",
    "restaurant POS",
    "digital menu",
    "online ordering",
    "kiosk",
    "restaurant management",
    "loyalty",
    "מערכת הזמנות למסעדות",
    "קופה למסעדה",
    "תפריט דיגיטלי",
  ],
  openGraph: {
    type: "website",
    siteName: "EZOrders",
    title: "EZOrders — restaurant ordering & management system",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    alternateLocale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "EZOrders — restaurant ordering & management system",
    description: SITE_DESCRIPTION,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EZOrders",
  url: "https://ezorders.com",
  description: SITE_DESCRIPTION,
  telephone: "*4958",
  sameAs: [] as string[],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={poppins.variable}>
      <body>
        {GTM_ID && (
          <>
            <Script id="gtm-base" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}