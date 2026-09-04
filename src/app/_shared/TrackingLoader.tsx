"use client";

import { useEffect } from "react";

import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

/**
 * Loads Google Tag Manager and the Meta Pixel — but only after the visitor
 * has agreed, and only the parts they agreed to.
 *
 * Replaces two <Script strategy="lazyOnload"> tags that ran unconditionally.
 * The scripts themselves are unchanged; what changed is that nothing is
 * injected until a consent record exists, and a later change of mind
 * (the banner fires CONSENT_EVENT) loads what was just permitted. Revoking
 * does not unload a script already running — the page would have to reload
 * for that — but it does flip Google Consent Mode to "denied", which is what
 * Google's tags honour, and it stops any further Meta events.
 *
 * Google Consent Mode v2: the default state is set to denied before GTM
 * loads, then updated from the visitor's choice. GA4 and Google Ads inside
 * the container read these signals themselves; no tag has to be reconfigured.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    __ezTracking?: { gtm?: boolean; pixel?: boolean };
  }
}

function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // GTM reads consent commands from the arguments object, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments as unknown as Record<string, unknown>);
}

function applyConsentMode(consent: Consent | null) {
  const granted = (v: boolean) => (v ? "granted" : "denied");
  const analytics = consent?.analytics === true;
  const marketing = consent?.marketing === true;
  gtag("consent", "update", {
    analytics_storage: granted(analytics),
    ad_storage: granted(marketing),
    ad_user_data: granted(marketing),
    ad_personalization: granted(marketing),
  });
}

function loadGtm() {
  if (!GTM_ID || window.__ezTracking?.gtm) return;
  window.__ezTracking = { ...window.__ezTracking, gtm: true };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(s);
}

function loadPixel() {
  if (!META_PIXEL_ID || window.__ezTracking?.pixel) return;
  window.__ezTracking = { ...window.__ezTracking, pixel: true };
  // The standard Meta snippet, unminified.
  const w = window;
  if (!w.fbq) {
    const n = function (...args: unknown[]) {
      const f = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
      if (f.callMethod) f.callMethod(...args);
      else f.queue.push(args);
    } as unknown as ((...args: unknown[]) => void) & { queue: unknown[]; loaded: boolean; version: string; push: unknown };
    n.queue = [];
    n.loaded = true;
    n.version = "2.0";
    n.push = n;
    w.fbq = n;
    w._fbq = n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  w.fbq?.("init", META_PIXEL_ID);
  w.fbq?.("track", "PageView");
}

function applyConsent(consent: Consent | null) {
  applyConsentMode(consent);
  if (!consent) return;
  if (consent.analytics || consent.marketing) loadGtm();
  if (consent.marketing) loadPixel();
}

export function TrackingLoader() {
  useEffect(() => {
    // Consent Mode defaults must precede any Google tag. Nothing of Google's
    // is on the page yet, so this is the right moment.
    gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });

    // Defer the initial load to idle time, as the old lazyOnload did: the
    // tags are heavy and nothing about a lead depends on them being early.
    const run = () => applyConsent(readConsent());
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = idle ? idle(run) : window.setTimeout(run, 1500);

    const onChange = (e: Event) => applyConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      if (!idle) window.clearTimeout(handle as number);
    };
  }, []);

  return null;
}
