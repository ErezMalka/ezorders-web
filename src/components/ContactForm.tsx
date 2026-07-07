"use client";

import { createElement, useState } from "react";

type Locale = "en" | "he";

type Labels = {
    title: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    agree: string;
    privacy: string;
    submit: string;
    sending: string;
    success: string;
    errorGeneric: string;
    errorConfig: string;
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
          message: "Message",
          agree: "I read and approve",
          privacy: "privacy policy.",
          submit: "Submit",
          sending: "Sending\u2026",
          success: "Thanks! Your message has been sent. We\u2019ll be in touch shortly.",
          errorGeneric: "Something went wrong. Please try again or email us directly.",
          errorConfig: "The form is not configured yet. Please email us directly at hello@ezorders.com.",
          errorRequired: "Please fill in your name, email and message.",
          errorEmail: "Please enter a valid email address.",
          errorAgree: "Please approve the privacy policy to continue.",
    },
    he: {
          title: "\u05d1\u05d5\u05d0\u05d5 \u05e0\u05d3\u05d1\u05e8",
          name: "\u05e9\u05dd \u05de\u05dc\u05d0",
          email: "\u05d0\u05d9\u05de\u05d9\u05d9\u05dc",
          phone: "\u05d8\u05dc\u05e4\u05d5\u05df",
          message: "\u05d4\u05d5\u05d3\u05e2\u05d4",
          agree: "\u05e7\u05e8\u05d0\u05ea\u05d9 \u05d5\u05d0\u05e0\u05d9 \u05de\u05d0\u05e9\u05e8/\u05ea \u05d0\u05ea",
          privacy: "\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea.",
          submit: "\u05e9\u05dc\u05d9\u05d7\u05d4",
          sending: "\u05e9\u05d5\u05dc\u05d7\u2026",
          success: "\u05ea\u05d5\u05d3\u05d4! \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e0\u05e9\u05dc\u05d7\u05d4 \u05d5\u05e0\u05d7\u05d6\u05d5\u05e8 \u05d0\u05dc\u05d9\u05da \u05d1\u05d4\u05e7\u05d3\u05dd.",
          errorGeneric: "\u05de\u05e9\u05d4\u05d5 \u05d4\u05e9\u05ea\u05d1\u05e9. \u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1 \u05d0\u05d5 \u05e9\u05dc\u05d7\u05d5 \u05dc\u05e0\u05d5 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05d9\u05e9\u05d9\u05e8\u05d5\u05ea.",
          errorConfig: "\u05d4\u05d8\u05d5\u05e4\u05e1 \u05e2\u05d3\u05d9\u05d9\u05df \u05dc\u05d0 \u05de\u05d5\u05d2\u05d3\u05e8. \u05e0\u05d9\u05ea\u05df \u05dc\u05e4\u05e0\u05d5\u05ea \u05d0\u05dc\u05d9\u05e0\u05d5 \u05d9\u05e9\u05d9\u05e8\u05d5\u05ea \u05d1-hello@ezorders.com.",
          errorRequired: "\u05d0\u05e0\u05d0 \u05de\u05dc\u05d0\u05d5 \u05e9\u05dd, \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05d5\u05d4\u05d5\u05d3\u05e2\u05d4.",
          errorEmail: "\u05d0\u05e0\u05d0 \u05d4\u05d6\u05d9\u05e0\u05d5 \u05db\u05ea\u05d5\u05d1\u05ea \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05ea\u05e7\u05d9\u05e0\u05d4.",
          errorAgree: "\u05d0\u05e0\u05d0 \u05d0\u05e9\u05e8\u05d5 \u05d0\u05ea \u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea \u05db\u05d3\u05d9 \u05dc\u05d4\u05de\u05e9\u05d9\u05da.",
    },
};

const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo";

export function ContactForm({ locale = "en" }: { locale?: Locale }) {
    const t = LABELS[locale];
    const privacyHref = locale === "he" ? "/he/privacy" : "/privacy";

  const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
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

      const endpoint = process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT;
        if (!endpoint) {
                setStatus("error");
                setErrorMsg(t.errorConfig);
                return;
        }

      setStatus("sending");
        try {
                const res = await fetch(endpoint, {
                          method: "POST",
                          headers: { Accept: "application/json", "Content-Type": "application/json" },
                          body: JSON.stringify({ name, email, phone, message, locale }),
                });
                if (!res.ok) throw new Error("Request failed");
                setStatus("success");
                setName("");
                setEmail("");
                setPhone("");
                setMessage("");
                setAgree(false);
        } catch {
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
        createElement("textarea", {
                value: message,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
                placeholder: t.message,
                "aria-label": t.message,
                rows: 4,
                className: inputClass,
        })
      );

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
        consent,
        errorBanner,
        submitBtn
      );
}
