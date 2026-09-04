/**
 * Cookie / tracking consent — the one place that knows what the visitor
 * agreed to.
 *
 * Israeli law (Privacy Protection Law, Amendment 13, in force August 2025) and
 * the Privacy Protection Authority's opinion on consent (25 February 2026)
 * require active opt-in before any secondary use of a visitor's data —
 * analytics and marketing tracking included — with refusing as easy as
 * accepting, and a way to change one's mind later. Before this module the
 * site loaded Google Tag Manager and the Meta Pixel on every page view.
 *
 * Three categories, mirroring what actually runs on the site:
 *   necessary  — always on: the session, the form's anti-spam token, the
 *                accessibility and consent choices themselves.
 *   analytics  — GA4 through Google Tag Manager.
 *   marketing  — Google Ads conversions (also through GTM) and the Meta Pixel,
 *                plus the server-side Meta Conversions API relay.
 *
 * Stored in localStorage (and mirrored in a cookie so the server could read
 * it if ever needed). Absent means "not asked yet" — the banner shows and
 * nothing loads. The version bumps whenever the categories or their meaning
 * change, which re-asks everyone.
 */

export const CONSENT_KEY = "ezorders-consent";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "ezorders:consent";
export const OPEN_CONSENT_EVENT = "ezorders:open-consent";

export type Consent = {
  version: number;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of the choice. */
  at: string;
};

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      version: CONSENT_VERSION,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      at: typeof parsed.at === "string" ? parsed.at : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const consent: Consent = { version: CONSENT_VERSION, ...choice, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    // Mirror for the server and for anyone reading cookies; 6 months.
    const value = `v${CONSENT_VERSION}:a${choice.analytics ? 1 : 0}:m${choice.marketing ? 1 : 0}`;
    document.cookie = `${CONSENT_KEY}=${value}; Max-Age=${60 * 60 * 24 * 182}; Path=/; SameSite=Lax`;
  } catch {
    /* storage blocked: the choice still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  return consent;
}

/** Ask the banner to open, e.g. from the footer's "cookie settings" link. */
export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

/** True when the visitor has agreed to marketing tracking. Safe on the server (false). */
export function hasMarketingConsent(): boolean {
  return readConsent()?.marketing === true;
}
