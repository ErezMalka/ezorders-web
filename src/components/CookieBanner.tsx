"use client";

import { useEffect, useState } from "react";

import { OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";

/**
 * The consent banner. Shown once, at the bottom, until the visitor chooses;
 * reopened from the footer's "cookie settings" link.
 *
 * What the Privacy Protection Authority's consent opinion (Feb 2026) asks for
 * and how each is met here:
 *   - active opt-in before secondary use  → nothing loads until a choice is
 *     saved (TrackingLoader reads the same record).
 *   - refusing as easy as accepting       → "only necessary" and "accept all"
 *     are the same size, same weight, side by side.
 *   - specific, plain-language purposes   → three named categories, one line
 *     each, no legalese; the policy is one click away for detail.
 *   - a way to change one's mind          → "settings" here, and a link in
 *     the footer that reopens this.
 *
 * Not a modal: it does not block the page. A visitor who ignores it can read
 * everything; they just are not tracked while they do.
 */

const COPY = {
  he: {
    title: "עוגיות באתר הזה",
    body: "אנחנו משתמשים בעוגיות הכרחיות כדי שהאתר יעבוד, ובכפוף להסכמתכם — בעוגיות סטטיסטיקה (Google Analytics) ושיווק (Google Ads, Meta) כדי להבין מה עובד ולהציג לכם פרסום רלוונטי. אפשר לשנות את הבחירה בכל עת דרך \"הגדרות עוגיות\" בתחתית העמוד.",
    policy: "מדיניות הפרטיות",
    policyHref: "/he/privacy",
    acceptAll: "מאשר/ת הכול",
    necessaryOnly: "הכרחיות בלבד",
    settings: "הגדרות",
    save: "שמירת הבחירה",
    back: "חזרה",
    necessary: "הכרחיות",
    necessaryDesc: "תפעול האתר, הגנה מספאם בטופס, ושמירת ההעדפות שלכם (נגישות, עוגיות). תמיד פעילות.",
    analytics: "סטטיסטיקה",
    analyticsDesc: "Google Analytics — אילו עמודים נצפים ומאיפה מגיעים, בצורה מצטברת.",
    marketing: "שיווק",
    marketingDesc: "Google Ads ו-Meta (פייסבוק/אינסטגרם) — מדידת קמפיינים והצגת פרסום מותאם.",
    always: "תמיד פעיל",
  },
  en: {
    title: "Cookies on this site",
    body: "We use necessary cookies to make the site work and, with your consent, statistics cookies (Google Analytics) and marketing cookies (Google Ads, Meta) to understand what works and show you relevant ads. You can change your choice any time via \"Cookie settings\" in the footer.",
    policy: "Privacy policy",
    policyHref: "/en/privacy",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    settings: "Settings",
    save: "Save choice",
    back: "Back",
    necessary: "Necessary",
    necessaryDesc: "Running the site, spam protection on the form, and remembering your preferences (accessibility, cookies). Always on.",
    analytics: "Statistics",
    analyticsDesc: "Google Analytics — which pages are viewed and where visitors come from, in aggregate.",
    marketing: "Marketing",
    marketingDesc: "Google Ads and Meta (Facebook/Instagram) — campaign measurement and tailored ads.",
    always: "Always on",
  },
} as const;

export function CookieBanner({ locale = "he" }: { locale?: "he" | "en" }) {
  const t = COPY[locale];
  const [visible, setVisible] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setVisible(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const onOpen = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setDetailed(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  if (!visible) return null;

  const choose = (a: boolean, m: boolean) => {
    writeConsent({ analytics: a, marketing: m });
    setVisible(false);
    setDetailed(false);
  };

  const btn = "min-h-11 flex-1 rounded-pill px-5 py-2.5 text-sm font-semibold transition";
  const primary = `${btn} bg-brand-indigo text-white hover:bg-brand-dark`;
  const secondary = `${btn} border-2 border-brand-indigo bg-white text-brand-indigo hover:bg-brand-grey`;

  return (
    <div
      role="region"
      aria-label={t.title}
      dir={locale === "he" ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-[65] p-3 sm:p-5"
    >
      <div className="mx-auto max-w-3xl rounded-card border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-base font-bold text-brand-dark">{t.title}</h2>

        {!detailed ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              {t.body}{" "}
              <a href={t.policyHref} className="text-brand-indigo underline underline-offset-2">
                {t.policy}
              </a>
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => choose(true, true)} className={primary}>
                {t.acceptAll}
              </button>
              <button type="button" onClick={() => choose(false, false)} className={secondary}>
                {t.necessaryOnly}
              </button>
              <button
                type="button"
                onClick={() => setDetailed(true)}
                className={`${btn} text-brand-muted underline underline-offset-2 hover:text-brand-dark sm:flex-none`}
              >
                {t.settings}
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-slate-100">
              <li className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{t.necessary}</p>
                  <p className="text-xs text-brand-muted">{t.necessaryDesc}</p>
                </div>
                <span className="flex-shrink-0 rounded-pill bg-brand-grey px-3 py-1 text-xs font-medium text-brand-muted">
                  {t.always}
                </span>
              </li>
              {(
                [
                  ["analytics", t.analytics, t.analyticsDesc, analytics, setAnalytics],
                  ["marketing", t.marketing, t.marketingDesc, marketing, setMarketing],
                ] as const
              ).map(([key, label, desc, on, set]) => (
                <li key={key} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">{label}</p>
                    <p className="text-xs text-brand-muted">{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => set(!on)}
                    className={`relative mt-1 h-6 w-11 flex-shrink-0 rounded-full transition ${
                      on ? "bg-brand-indigo" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        on ? "start-[22px]" : "start-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => choose(analytics, marketing)} className={primary}>
                {t.save}
              </button>
              <button type="button" onClick={() => choose(false, false)} className={secondary}>
                {t.necessaryOnly}
              </button>
              <button type="button" onClick={() => choose(true, true)} className={secondary}>
                {t.acceptAll}
              </button>
              <button
                type="button"
                onClick={() => setDetailed(false)}
                className={`${btn} text-brand-muted underline underline-offset-2 hover:text-brand-dark sm:flex-none`}
              >
                {t.back}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** A footer link that reopens the banner. Client-side because it dispatches an event. */
export function CookieSettingsLink({ locale = "he", className }: { locale?: "he" | "en"; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      {locale === "he" ? "הגדרות עוגיות" : "Cookie settings"}
    </button>
  );
}
