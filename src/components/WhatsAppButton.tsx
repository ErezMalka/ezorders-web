"use client";

import { useCallback, type MouseEvent } from "react";

/**
 * WhatsApp contact, with the measurement the contact form would have given us.
 *
 * The site had no public WhatsApp route at all — every wa.me link in the code
 * was internal tooling for sending quotes out. That is a real gap in this
 * market, where a restaurant owner is far more likely to send a message than
 * to fill in a form.
 *
 * The catch is that a WhatsApp lead bypasses /api/contact, so it never reaches
 * the Conversions API, GTM, or the AdsHub pipe. This fires those signals at
 * click time instead, which is the only moment we have: nobody has typed a name
 * or a phone number, and putting a form in front of the button would destroy
 * the one thing WhatsApp is good for.
 *
 * So this deliberately does NOT create a lead record. A click is an intent
 * signal, not an identified lead, and writing a row with no name and no phone
 * would pollute the pipe that feeds the sales team. What it does instead:
 *
 *   * Meta `Contact`, attributed through the _fbp / _fbc cookies the pixel
 *     already sets, so the ad click that produced this is still credited
 *     without any personal data being sent.
 *   * A `whatsapp_click` dataLayer event, so Google Ads and GA4 can count it
 *     as a conversion alongside the form.
 *   * The originating page carried into the prefilled message, so the incoming
 *     conversation arrives with the context the form field would have supplied.
 *
 * The Speed-to-Lead auto-reply is not wired up here and should not be: it
 * exists because a form submission is silent, and WhatsApp already notifies you
 * the instant the message lands.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

/** E.164 without punctuation, which is the only form wa.me accepts. */
const WHATSAPP_NUMBER = "972508384505";

const COPY = {
  he: {
    label: "שלחו הודעה בוואטסאפ",
    aria: "פתיחת שיחת וואטסאפ עם EZOrders",
    greeting: "היי, הגעתי מהאתר ואשמח לשמוע עוד על EZOrders",
  },
  en: {
    label: "Message us on WhatsApp",
    aria: "Open a WhatsApp conversation with EZOrders",
    greeting: "Hi, I came from your website and would like to hear more about EZOrders",
  },
} as const;

export function WhatsAppButton({
  locale = "he",
  className,
}: {
  locale?: "he" | "en";
  className?: string;
}) {
  const t = COPY[locale];

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === "undefined") return;

      const pagePath = window.location.pathname;

      // Created here rather than read from a global, so the push works even when
      // GTM has not loaded yet — it now loads on idle, after the page is done.
      // GTM replays whatever is already queued when it arrives.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "whatsapp_click", locale, pagePath });

      // Guarded because the pixel is deferred too. A missed browser event is an
      // acceptable loss here; blocking the click on it would not be.
      if (typeof window.fbq === "function") {
        window.fbq("track", "Contact", { content_name: "whatsapp", locale });
      }

      // Name the page in the message so the conversation opens with the context
      // the form's "which product" field would have carried — the sales team
      // sees whether this came from the kiosk page or the pricing page without
      // having to ask. The title is trimmed of the brand suffix because the
      // recipient is a person, not a log line. Built at click time rather than
      // at render because the server has no document to read a title from, and
      // guessing one would mean a hydration mismatch.
      const subject = document.title.split("|")[0].split("—")[0].trim();
      const message = subject ? `${t.greeting} (${subject})` : t.greeting;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      // Only take over the navigation once the enriched URL is ready. If the
      // popup is blocked, fall through to the plain href in the markup rather
      // than stranding the visitor on a click that did nothing.
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) event.preventDefault();
    },
    [locale, t.greeting],
  );

  // Static fallback: correct on its own for a middle-click, a right-click, or a
  // visitor with JavaScript disabled. The click handler upgrades it in place.
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.greeting)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={t.aria}
      // Dark ink on WhatsApp green, not white. White on #25D366 measures
      // 1.98:1 — below even the 3:1 large-text floor — and WhatsApp using it in
      // their own UI does not make it legible here. Darkening the green instead
      // would pass, but #25D366 is the part people recognise at a glance, so
      // the text moves and the colour stays: 9.38:1, and still obviously
      // WhatsApp. The ink is their own chat-surface dark.
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-[#25D366] px-6 py-3 font-semibold text-[#0B141A] transition hover:bg-[#1DBE5C] ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.142 1.593 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.940-5.359 11.943-11.945a11.821 11.821 0 00-3.416-8.4" />
      </svg>
      {t.label}
    </a>
  );
}
