"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { hasMarketingConsent } from "@/lib/consent";
import { VISUALLY_HIDDEN } from "@/lib/visually-hidden";

type Locale = "en" | "he";

// Cloudflare Turnstile is loaded lazily and only when a site key is configured.
type TurnstileApi = {
render: (
el: HTMLElement,
opts: {
sitekey: string;
callback: (token: string) => void;
"expired-callback"?: () => void;
"error-callback"?: () => void;
theme?: "auto" | "light" | "dark";
},
) => string;
reset: (id?: string) => void;
};
declare global {
interface Window {
turnstile?: TurnstileApi;
dataLayer?: Record<string, unknown>[];
fbq?: (...args: unknown[]) => void;
}
}

// Generates a unique id shared between the browser Pixel event and the
// server-side Conversions API event so Meta deduplicates the two.
function newEventId(): string {
if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Build-time inlined; when unset, all Turnstile code paths are skipped.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Labels = {
title: string;
name: string;
email: string;
phone: string;
business: string;
message: string;
agree: string;
privacy: string;
submit: string;
sending: string;
success: string;
errorGeneric: string;
errorRequired: string;
errorEmail: string;
errorAgree: string;
errorCaptcha: string;
marketing: string;
};

const LABELS: Record<Locale, Labels> = {
en: {
title: "Let\u2019s chat",
name: "Full name",
email: "Email",
phone: "Phone",
business: "Business name",
message: "Message",
agree: "I read and approve",
privacy: "privacy policy.",
submit: "Submit",
sending: "Sending\u2026",
success: "Thanks! Your message has been sent. We\u2019ll be in touch shortly.",
errorGeneric: "Something went wrong. Please try again or email us directly.",
errorRequired: "Please fill in your name, email and message.",
errorEmail: "Please enter a valid email address.",
errorAgree: "Please approve the privacy policy to continue.",
errorCaptcha: "Please complete the verification and try again.",
marketing: "I\u2019d like to receive updates and offers from EZOrders by email or WhatsApp (optional, you can opt out any time).",
},
he: {
title: "\u05d1\u05d5\u05d0\u05d5 \u05e0\u05d3\u05d1\u05e8",
name: "\u05e9\u05dd \u05de\u05dc\u05d0",
email: "\u05d0\u05d9\u05de\u05d9\u05d9\u05dc",
phone: "\u05d8\u05dc\u05e4\u05d5\u05df",
business: "\u05e9\u05dd \u05d4\u05e2\u05e1\u05e7",
message: "\u05d4\u05d5\u05d3\u05e2\u05d4",
agree: "\u05e7\u05e8\u05d0\u05ea\u05d9 \u05d5\u05d0\u05e0\u05d9 \u05de\u05d0\u05e9\u05e8/\u05ea \u05d0\u05ea",
privacy: "\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea.",
submit: "\u05e9\u05dc\u05d9\u05d7\u05d4",
sending: "\u05e9\u05d5\u05dc\u05d7\u2026",
success: "\u05ea\u05d5\u05d3\u05d4! \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e0\u05e9\u05dc\u05d7\u05d4 \u05d5\u05e0\u05d7\u05d6\u05d5\u05e8 \u05d0\u05dc\u05d9\u05da \u05d1\u05d4\u05e7\u05d3\u05dd.",
errorGeneric: "\u05de\u05e9\u05d4\u05d5 \u05d4\u05e9\u05ea\u05d1\u05e9. \u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1 \u05d0\u05d5 \u05e9\u05dc\u05d7\u05d5 \u05dc\u05e0\u05d5 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05d9\u05e9\u05d9\u05e8\u05d5\u05ea.",
errorRequired: "\u05d0\u05e0\u05d0 \u05de\u05dc\u05d0\u05d5 \u05e9\u05dd, \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05d5\u05d4\u05d5\u05d3\u05e2\u05d4.",
errorEmail: "\u05d0\u05e0\u05d0 \u05d4\u05d6\u05d9\u05e0\u05d5 \u05db\u05ea\u05d5\u05d1\u05ea \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05ea\u05e7\u05d9\u05e0\u05d4.",
errorAgree: "\u05d0\u05e0\u05d0 \u05d0\u05e9\u05e8\u05d5 \u05d0\u05ea \u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea \u05db\u05d3\u05d9 \u05dc\u05d4\u05de\u05e9\u05d9\u05da.",
errorCaptcha: "\u05d0\u05e0\u05d0 \u05d4\u05e9\u05dc\u05d9\u05de\u05d5 \u05d0\u05ea \u05d0\u05d9\u05de\u05d5\u05ea \u05d4\u05d0\u05d1\u05d8\u05d7\u05d4 \u05d5\u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1.",
marketing: "אשמח לקבל עדכונים והצעות מ-EZOrders במייל או בוואטסאפ (לא חובה, אפשר להסיר בכל עת).",
},
};

const inputClass =
"w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20";

function getUtm() {
if (typeof window === "undefined") return null;
const params = new URLSearchParams(window.location.search);
const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const out: Record<string, string | null> = {};
let found = false;
for (const k of keys) {
const v = params.get(k);
out[k] = v;
if (v) found = true;
}
return found ? out : null;
}

// The Google click id, for lead attribution. Prefers the URL (?gclid=…) and
// falls back to the _gcl_aw cookie set by Google's conversion linker.
function getGclid(): string {
if (typeof window === "undefined") return "";
const fromUrl = new URLSearchParams(window.location.search).get("gclid");
if (fromUrl) return fromUrl;
const m = document.cookie.match(/(?:^|;\s*)_gcl_aw=GCL\.\d+\.([^;]+)/);
return m ? m[1] : "";
}

/**
 * `headingLevel: "none"` drops the form's own heading.
 *
 * Inside ContactBand the section already renders an h2 carrying the identical
 * string — "בואו נדבר" appeared twice in a row on all twelve pages that use the
 * band. A repeated heading is noise for a sighted reader and worse for a screen
 * reader navigating by headings, since the second one promises a new section
 * and delivers the same one. The form keeps an accessible name either way: when
 * the heading is dropped, aria-label carries it instead.
 */
export function ContactForm({
  locale = "en",
  showHeading = true,
}: {
  locale?: Locale;
  showHeading?: boolean;
}) {
const t = LABELS[locale];
const privacyHref = locale === "he" ? "/he/privacy" : "/privacy";

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [business, setBusiness] = useState("");
const [message, setMessage] = useState("");
const [companyUrl, setCompanyUrl] = useState("");
const [agree, setAgree] = useState(false);
// Marketing opt-in. Unticked by default and separate from the privacy
// acknowledgement above: the Spam Law (s. 30A) and Amendment 13 both require
// an explicit, distinct yes before anyone is added to a mailing list.
const [marketingOptIn, setMarketingOptIn] = useState(false);
const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
const [errorMsg, setErrorMsg] = useState("");
const [captchaToken, setCaptchaToken] = useState("");

const captchaRef = useRef<HTMLDivElement | null>(null);
const widgetIdRef = useRef<string | null>(null);

// Load and render the Turnstile widget once, only when a site key is set.
useEffect(() => {
if (!TURNSTILE_SITE_KEY || typeof window === "undefined") return;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const renderWidget = () => {
if (!captchaRef.current || widgetIdRef.current || !window.turnstile) return;
widgetIdRef.current = window.turnstile.render(captchaRef.current, {
sitekey: TURNSTILE_SITE_KEY,
callback: (token: string) => setCaptchaToken(token),
"expired-callback": () => setCaptchaToken(""),
"error-callback": () => setCaptchaToken(""),
theme: "auto",
});
};

if (window.turnstile) {
renderWidget();
return;
}
let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
if (!script) {
script = document.createElement("script");
script.src = SCRIPT_SRC;
script.async = true;
script.defer = true;
document.head.appendChild(script);
}
script.addEventListener("load", renderWidget);
return () => script?.removeEventListener("load", renderWidget);
}, []);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function handleSubmit(e: React.FormEvent) {
e.preventDefault();
setErrorMsg("");

if (!name.trim() || !email.trim() || !message.trim()) {
setStatus("error");
setErrorMsg(t.errorRequired);
return;
}
if (!isValidEmail(email)) {
setStatus("error");
setErrorMsg(t.errorEmail);
return;
}
if (!agree) {
setStatus("error");
setErrorMsg(t.errorAgree);
return;
}
if (TURNSTILE_SITE_KEY && !captchaToken) {
setStatus("error");
setErrorMsg(t.errorCaptcha);
return;
}

setStatus("sending");

// Shared id so the browser Pixel event and the server Conversions API event
// are deduplicated by Meta into a single Lead conversion.
const eventId = newEventId();

// Send the lead through our API route, which emails it via Resend.
// Success is shown ONLY when the request returns HTTP 200 and { ok: true }.
let delivered = false;
try {
const res = await fetch("/api/contact", {
method: "POST",
headers: { Accept: "application/json", "Content-Type": "application/json" },
body: JSON.stringify({
name,
email,
phone,
businessName: business,
message,
locale,
company_url: companyUrl,
turnstileToken: captchaToken,
eventId,
pagePath: typeof window !== "undefined" ? window.location.pathname : null,
utm: getUtm(),
gclid: getGclid(),
// Whether the visitor allowed marketing tracking. The server only forwards the
// lead to Meta's Conversions API when this is true — a server-side event is
// tracking too, and the banner's "necessary only" has to mean it.
marketingConsent: hasMarketingConsent(),
marketingOptIn,
}),
});
let json: { ok?: boolean } | null = null;
try {
json = await res.json();
} catch {
json = null;
}
delivered = res.ok && json?.ok === true;
if (!delivered) {
console.error("[contact] server api returned", res.status, json);
}
} catch (err) {
console.error("[contact] server api failed", err);
}

// Turnstile tokens are single-use — reset so a fresh one is issued next time.
if (TURNSTILE_SITE_KEY && window.turnstile && widgetIdRef.current) {
window.turnstile.reset(widgetIdRef.current);
setCaptchaToken("");
}

if (delivered) {
// Fire one semantic conversion event for GTM. Google Ads / Meta Pixel / GA4
// all trigger off this single event. Safe no-op when GTM/dataLayer is absent.
if (typeof window !== "undefined") {
// GTM event for Google Ads + GA4 conversions (Meta is handled directly below).
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
event: "lead_submit",
form: "contact",
locale,
pagePath: window.location.pathname,
eventId,
});
// Meta Pixel Lead event (browser side). Same eventId as the server-side
// Conversions API call in /api/contact so Meta counts it once. No-op when
// the pixel is not configured.
if (typeof window.fbq === "function") {
window.fbq("track", "Lead", { content_name: "contact", locale }, { eventID: eventId });
}
}
setStatus("success");
setName("");
setEmail("");
setPhone("");
setBusiness("");
setMessage("");
setAgree(false);
} else {
setStatus("error");
setErrorMsg(t.errorGeneric);
}
}

if (status === "success") {
return createElement(
"div",
{ className: "rounded-card bg-white p-8 shadow-lg text-center" },
createElement(
"h3",
{ className: "mb-3 text-2xl font-semibold text-brand-dark" },
t.title
),
createElement("p", { className: "text-brand-muted" }, t.success)
);
}

const fields = createElement(
"div",
{ className: "space-y-4" },
createElement("input", {
value: name,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
placeholder: t.name,
"aria-label": t.name,
"aria-required": true,
required: true,
autoComplete: "name",
className: inputClass,
}),
createElement("input", {
type: "email",
inputMode: "email",
value: email,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
placeholder: t.email,
"aria-label": t.email,
"aria-required": true,
required: true,
autoComplete: "email",
className: inputClass,
}),
createElement("input", {
type: "tel",
inputMode: "numeric",
pattern: "[0-9+\\-\\s]*",
value: phone,
onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
setPhone(e.target.value.replace(/[^0-9+\-\s]/g, "")),
placeholder: t.phone,
"aria-label": t.phone,
autoComplete: "tel",
className: inputClass,
}),
createElement("input", {
value: business,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBusiness(e.target.value),
placeholder: t.business,
"aria-label": t.business,
autoComplete: "organization",
className: inputClass,
}),
createElement("textarea", {
value: message,
onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
placeholder: t.message,
"aria-label": t.message,
"aria-required": true,
required: true,
rows: 4,
className: inputClass,
})
);

const honeypot = createElement("input", {
type: "text",
value: companyUrl,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCompanyUrl(e.target.value),
name: "company_url",
tabIndex: -1,
autoComplete: "off",
"aria-hidden": true,
style: VISUALLY_HIDDEN,
});

const consent = createElement(
"label",
{ className: "mt-4 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm" },
createElement("input", {
type: "checkbox",
checked: agree,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAgree(e.target.checked),
className: "h-6 w-6 flex-shrink-0 accent-brand-pink",
}),
t.agree,
" ",
createElement(
"a",
{ href: privacyHref, className: "text-brand-pinkInk underline" },
t.privacy
)
);

const marketingConsentBox = createElement(
"label",
{ className: "mt-2 flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-brand-muted" },
createElement("input", {
type: "checkbox",
checked: marketingOptIn,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setMarketingOptIn(e.target.checked),
className: "mt-0.5 h-6 w-6 flex-shrink-0 accent-brand-pink",
}),
t.marketing
);

const captchaWidget = TURNSTILE_SITE_KEY
? createElement("div", { ref: captchaRef, className: "mt-4" })
: null;

const errorBanner =
status === "error" && errorMsg
? createElement(
"p",
{ className: "mt-4 text-sm font-medium text-red-600", role: "alert" },
errorMsg
)
: null;

const submitBtn = createElement(
"button",
{
type: "submit",
disabled: status === "sending",
className:
"mt-5 w-full rounded-pill bg-brand-pinkStrong px-9 py-3 font-medium text-white transition hover:bg-brand-pinkInk disabled:opacity-60 sm:w-auto",
},
status === "sending" ? t.sending : t.submit
);

return createElement(
"form",
// p-5 on phones: this card sits inside another p-8 card, and the two together
// ate 128px of a 320px screen — enough to push the grid column past the page.
{
className: "min-w-0 rounded-card bg-white p-5 shadow-lg sm:p-8",
onSubmit: handleSubmit,
noValidate: true,
// Without a visible heading the form still needs a name of its own.
"aria-label": showHeading ? undefined : t.title,
},
showHeading
? createElement("h2", { className: "mb-6 text-center text-2xl font-semibold" }, t.title)
: null,
fields,
honeypot,
consent,
marketingConsentBox,
captchaWidget,
errorBanner,
submitBtn
);
}
