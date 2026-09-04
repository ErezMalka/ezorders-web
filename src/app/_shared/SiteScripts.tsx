import { A11yBootstrap } from "./A11yBootstrap";
import { TrackingLoader } from "./TrackingLoader";
import { organizationSchema } from "./site-metadata";

// The <body> chrome shared by every root layout: the accessibility bootstrap,
// the consent-gated tracking loader (Google Tag Manager for GA4 + Google Ads,
// and the Meta Pixel — see TrackingLoader.tsx for why neither loads before
// the visitor agrees), and the Organization JSON-LD.
//
// Meta tracking lives in code (the browser pixel + the server-side Conversions
// API relayed from /api/contact), NOT in GTM, so there is a single source of
// truth and browser+server events dedupe via a shared event_id. GTM stays
// responsible for Google Ads + GA4 only. Both are no-ops when their env ids
// are unset.
export default function SiteScripts() {
  return (
    <>
      <A11yBootstrap />
      {/* GTM and the Meta Pixel load from here, after consent. See TrackingLoader. */}
      <TrackingLoader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
