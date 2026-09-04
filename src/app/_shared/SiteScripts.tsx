import Script from "next/script";
import { organizationSchema } from "./site-metadata";

// The <body> chrome shared by every root layout: Google Tag Manager (no-op when
// NEXT_PUBLIC_GTM_ID is unset), the Meta Pixel (no-op when NEXT_PUBLIC_META_PIXEL_ID
// is unset), and the Organization JSON-LD.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// Meta (Facebook) Pixel. Meta tracking lives in code (this browser pixel + the
// server-side Conversions API relayed from /api/contact), NOT in GTM, so there is
// a single source of truth and browser+server events dedupe via a shared event_id.
// GTM stays responsible for Google Ads + GA4 only. Safe no-op when unset.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Both tag managers load with `lazyOnload` — after the window load event, in
// idle time — rather than `afterInteractive`, which starts them while the page
// is still painting. Measured on /he/price: the Meta pixel alone is 170KB, 37%
// of everything the page transfers, arriving between 1482ms and 1943ms.
//
// Nothing is lost by waiting, because neither conversion path depends on these
// scripts being present when the form is submitted:
//
//   * The Meta Lead event is sent server-side from /api/contact via the
//     Conversions API. The browser Pixel event is the duplicate, not the
//     original, and ContactForm already guards it behind a typeof check.
//   * The Google conversion is a dataLayer push, and ContactForm creates
//     `window.dataLayer` itself if it does not exist yet. GTM replays whatever
//     is queued when it finally loads.
//
// What does change is that a visitor who leaves within the first second or so
// may not register a PageView. That costs a retargeting impression from the
// least engaged possible visitor; it does not cost a lead.
export default function SiteScripts() {
  return (
    <>
      {GTM_ID && (
        <>
          <Script id="gtm-base" strategy="lazyOnload">
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
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="lazyOnload">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* A 1x1 tracking beacon, not an image. next/image would route the
                URL through the optimizer and the pixel would never reach Meta. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
