"use client";

import { useState } from "react";
import { hasMarketingConsent } from "@/lib/consent";
import { VISUALLY_HIDDEN } from "@/lib/visually-hidden";

// Lead form for the paid-traffic landing pages. Same pipe as the funnels
// (/api/lead-funnel → AdsHub web-lead → WhatsApp alert + Speed-to-Lead), so a
// landing-page lead is indistinguishable downstream from a funnel lead except
// for its `funnel` label. Attribution helpers mirror ContactForm/QueueCalculator.

function getGclid(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("gclid");
  if (fromUrl) return fromUrl;
  const m = document.cookie.match(/(?:^|;\s*)_gcl_aw=GCL\.\d+\.([^;]+)/);
  return m ? m[1] : "";
}

function getUtm() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const out: Record<string, string | null> = {};
  let found = false;
  for (const k of keys) {
    const v = p.get(k);
    out[k] = v;
    if (v) found = true;
  }
  return found ? out : null;
}

/** Shared by the browser Pixel event and the server-side CAPI event so Meta
 *  counts one conversion, not two. Mirrors ContactForm. */
function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type SelectField = {
  /** Key used in the structured `fields` payload (lead scoring). */
  name: string;
  label: string;
  options: string[];
};

export function LandingLeadForm({
  funnel,
  eventName,
  title,
  subtitle,
  cta,
  successTitle,
  successText,
  select,
  compact = false,
}: {
  funnel: string;
  /** content_name reported to GTM/Meta, e.g. "lp_pos". */
  eventName: string;
  title: string;
  subtitle: string;
  cta: string;
  successTitle: string;
  successText: string;
  select?: SelectField;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [choice, setChoice] = useState(select ? select.options[0] : "");
  const [companyUrl, setCompanyUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const eventId = newEventId();
    const message = [
      `דף נחיתה: ${funnel}`,
      business ? `שם העסק: ${business}` : "",
      select && choice ? `${select.label}: ${choice}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/lead-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel,
          name,
          phone,
          businessName: business,
          message,
          company_url: companyUrl,
          eventId,
          gclid: getGclid(),
          marketingConsent: hasMarketingConsent(),
          utm: getUtm(),
          pagePath: typeof window !== "undefined" ? window.location.pathname : null,
          fields: select && choice ? { [select.name]: choice } : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) {
        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "lead_submit", form: eventName, eventId });
          if (typeof window.fbq === "function")
            window.fbq("track", "Lead", { content_name: eventName }, { eventID: eventId });
        }
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className={`rounded-card bg-white shadow-xl ${compact ? "p-6" : "p-6 md:p-8"}`}
      id="lead-form"
    >
      {status === "success" ? (
        <div className="py-10 text-center">
          <h3 className="mb-2 text-2xl font-semibold text-brand-dark">{successTitle}</h3>
          <p className="text-brand-muted">{successText}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h3 className="mb-1 text-2xl font-semibold text-brand-dark">{title}</h3>
          <p className="mb-6 text-sm text-brand-muted">{subtitle}</p>
          <div className="space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              aria-label="שם מלא"
              autoComplete="name"
              className={inputClass}
            />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""))}
              placeholder="טלפון"
              aria-label="טלפון"
              autoComplete="tel"
              className={inputClass}
            />
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="שם העסק"
              aria-label="שם העסק"
              autoComplete="organization"
              className={inputClass}
            />
            {select ? (
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                aria-label={select.label}
                className={`${inputClass} bg-white`}
              >
                {select.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <input
            type="text"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            name="company_url"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            style={VISUALLY_HIDDEN}
          />
          {status === "error" && (
            <p className="mt-4 text-sm font-medium text-red-600" role="alert">
              אנא מלאו שם וטלפון ונסו שוב.
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-5 w-full rounded-pill bg-brand-pinkStrong px-9 py-3 font-medium text-white transition hover:bg-brand-pinkInk disabled:opacity-60"
          >
            {status === "sending" ? "שולח…" : cta}
          </button>
          <p className="mt-3 text-center text-xs text-brand-muted">
            ללא התחייבות · נחזור אליכם תוך יום עסקים
          </p>
        </form>
      )}
    </div>
  );
}
