import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={poppins.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}