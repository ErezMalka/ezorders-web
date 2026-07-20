"use client";

import { createElement, useState } from "react";

type Locale = "en" | "he";

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
},
};

const inputClass =
"w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo";

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

export function ContactForm({ locale = "en" }: { locale?: Locale }) {
const t = LABELS[locale];
const privacyHref = locale === "he" ? "/he/privacy" : "/privacy";

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [business, setBusiness] = useState("");
const [message, setMessage] = useState("");
const [companyUrl, setCompanyUrl] = useState("");
const [agree, setAgree] = useState(false);
const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
const [errorMsg, setErrorMsg] = useState("");

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

setStatus("sending");

const LEAD_EMAIL = "contact@ezorders.com";
const leadFields: Record<string, string> = {
_subject: "\u05e4\u05e0\u05d9\u05d9\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05de\u05d0\u05ea\u05e8 EzOrders \u2014 " + name,
_template: "table",
_replyto: email,
_captcha: "false",
"\u05e9\u05dd \u05de\u05dc\u05d0": name,
"\u05d0\u05d9\u05de\u05d9\u05d9\u05dc": email,
"\u05d8\u05dc\u05e4\u05d5\u05df": phone || "-",
"\u05e9\u05dd \u05d4\u05e2\u05e1\u05e7": business || "-",
"\u05d4\u05d5\u05d3\u05e2\u05d4": message,
"\u05e9\u05e4\u05d4": locale,
"\u05e2\u05de\u05d5\u05d3": typeof window !== "undefined" ? window.location.pathname : "-",
};

// Channel 1: direct browser AJAX to FormSubmit (the intended usage).
let delivered = false;
if (!companyUrl) {
try {
const fsRes = await fetch("https://formsubmit.co/ajax/" + LEAD_EMAIL, {
method: "POST",
headers: { Accept: "application/json", "Content-Type": "application/json" },
body: JSON.stringify(leadFields),
});
if (fsRes.ok) delivered = true;
else console.error("[contact] FormSubmit ajax status", fsRes.status);
} catch (err) {
console.error("[contact] FormSubmit ajax failed", err);
}

// Channel 2: hidden-iframe classic POST. Works even before the address is
// activated (it triggers the activation email) and is immune to CORS.
if (!delivered && typeof document !== "undefined") {
try {
let frame = document.getElementById("fs_frame") as HTMLIFrameElement | null;
if (!frame) {
frame = document.createElement("iframe");
frame.id = "fs_frame";
frame.name = "fs_frame";
frame.style.display = "none";
document.body.appendChild(frame);
}
const f = document.createElement("form");
f.method = "POST";
f.action = "https://formsubmit.co/" + LEAD_EMAIL;
f.target = "fs_frame";
f.style.display = "none";
for (const [k, v] of Object.entries(leadFields)) {
const i = document.createElement("input");
i.type = "hidden";
i.name = k;
i.value = v;
f.appendChild(i);
}
document.body.appendChild(f);
f.submit();
setTimeout(() => f.remove(), 4000);
delivered = true;
} catch (err) {
console.error("[contact] FormSubmit iframe failed", err);
}
}
}

// Channel 3 (background): server API \u2014 CRM webhook + server-side email backup.
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
pagePath: typeof window !== "undefined" ? window.location.pathname : null,
utm: getUtm(),
}),
});
if (res.ok) delivered = true;
} catch (err) {
console.error("[contact] server api failed", err);
}

if (delivered || companyUrl) {
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
className: inputClass,
}),
createElement("input", {
type: "email",
value: email,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
placeholder: t.email,
"aria-label": t.email,
className: inputClass,
}),
createElement("input", {
value: phone,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value),
placeholder: t.phone,
"aria-label": t.phone,
className: inputClass,
}),
createElement("input", {
value: business,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBusiness(e.target.value),
placeholder: t.business,
"aria-label": t.business,
className: inputClass,
}),
createElement("textarea", {
value: message,
onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
placeholder: t.message,
"aria-label": t.message,
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
style: { position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 },
});

const consent = createElement(
"label",
{ className: "mt-4 flex items-center gap-2 text-sm" },
createElement("input", {
type: "checkbox",
checked: agree,
onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAgree(e.target.checked),
}),
t.agree,
" ",
createElement(
"a",
{ href: privacyHref, className: "text-brand-pink underline" },
t.privacy
)
);

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
"mt-5 rounded-pill bg-brand-pink px-9 py-3 font-medium text-white transition hover:bg-brand-pinkDark disabled:opacity-60",
},
status === "sending" ? t.sending : t.submit
);

return createElement(
"form",
{ className: "rounded-card bg-white p-8 shadow-lg", onSubmit: handleSubmit, noValidate: true },
createElement("h3", { className: "mb-6 text-center text-2xl font-semibold" }, t.title),
fields,
honeypot,
consent,
errorBanner,
submitBtn
);
}
