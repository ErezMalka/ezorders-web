"use client";

import { useMemo, useState } from "react";
import { VISUALLY_HIDDEN } from "@/lib/visually-hidden";
import { computeCommission, PROCESSING_RATE } from "@/lib/commission";

/**
 * What delivery-platform commission costs, and what a direct channel returns.
 *
 * The dishonest version of this calculator multiplies revenue by the
 * commission rate and presents the whole number as savings. It would show a
 * bigger figure and it would be wrong twice over: a direct order still carries
 * card processing, and the platforms bring demand the restaurant does not have
 * on its own. An operator who has run a restaurant knows both of those, so the
 * inflated number costs more credibility than it buys attention.
 *
 * So the model is deliberately conservative. Only a share of orders is treated
 * as shiftable — the repeat customers who already know the place and would
 * order direct if there were somewhere to do it — and processing is netted off
 * that share before anything is called a saving. The share is a slider rather
 * than a constant, because the honest answer depends on how much of the
 * restaurant's traffic is regulars, and only the operator knows that.
 */

// --- Lead attribution helpers (mirror ContactForm and QueueCalculator) ---
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

const ils = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

function Slider({
  label,
  suffix,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-white/90">{label}</span>
        <span className="text-lg font-bold text-white">
          {value.toLocaleString("he-IL")}
          <span className="ms-1 text-sm font-normal text-white/70">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-white"
      />
    </div>
  );
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

export function CommissionCalculator() {
  const [monthlyOrders, setMonthlyOrders] = useState(600);
  const [avgTicket, setAvgTicket] = useState(90);
  const [commission, setCommission] = useState(28);
  const [shiftable, setShiftable] = useState(25);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const { platformRevenue, commissionPaid, netMonthlySaving, netYearlySaving } = useMemo(
    () =>
      computeCommission({
        monthlyOrders,
        avgTicket,
        commissionPct: commission,
        shiftablePct: shiftable,
      }),
    [monthlyOrders, avgTicket, commission, shiftable],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");

    const message = [
      "מחשבון העמלות — תוצאה:",
      `הזמנות משלוחים בחודש: ${monthlyOrders}`,
      `ממוצע הזמנה: ${ils(avgTicket)}`,
      `עמלה: ${commission}%`,
      `מחזור דרך פלטפורמות: ${ils(platformRevenue)}`,
      `עמלה חודשית: ${ils(commissionPaid)}`,
      `הערכת חיסכון נטו בהסטת ${shiftable}%: ${ils(netMonthlySaving)} בחודש`,
    ].join("\n");

    try {
      const res = await fetch("/api/lead-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: "מחשבון העמלות",
          name,
          phone,
          businessName: business,
          message,
          company_url: companyUrl,
          gclid: getGclid(),
          utm: getUtm(),
          pagePath: typeof window !== "undefined" ? window.location.pathname : null,
          fields: {
            monthly_orders: monthlyOrders,
            avg_ticket: avgTicket,
            commission_pct: commission,
            shiftable_pct: shiftable,
            est_monthly_commission: Math.round(commissionPaid),
            est_monthly_saving: Math.round(netMonthlySaving),
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) {
        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "lead_submit", form: "commission_calculator" });
          if (typeof window.fbq === "function")
            window.fbq("track", "Lead", { content_name: "commission_calculator" });
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
    <div className="grid items-start gap-8 md:grid-cols-2">
      {/* Calculator card */}
      <div className="rounded-card bg-brand-indigo p-6 md:p-8">
        <h2 className="mb-1 text-xl font-bold text-white">כמה אתם משלמים בעמלות?</h2>
        <p className="mb-6 text-sm text-white/70">הזיזו את הסליידרים לפי המסעדה שלכם.</p>

        <div className="space-y-6">
          <Slider label="הזמנות משלוחים בחודש" suffix="הזמנות" min={50} max={3000} step={25} value={monthlyOrders} onChange={setMonthlyOrders} />
          <Slider label="ממוצע הזמנה" suffix="₪" min={40} max={250} step={5} value={avgTicket} onChange={setAvgTicket} />
          <Slider label="שיעור העמלה" suffix="%" min={10} max={35} step={1} value={commission} onChange={setCommission} />
          <Slider label="כמה מההזמנות הן לקוחות חוזרים" suffix="%" min={0} max={60} step={5} value={shiftable} onChange={setShiftable} />
        </div>

        <div className="mt-8 space-y-3">
          <div className="rounded-xl bg-white/10 p-4 text-center">
            <div className="text-sm text-white/70">אתם משלמים בעמלות</div>
            <div className="my-1 text-3xl font-extrabold text-white">{ils(commissionPaid)}</div>
            <div className="text-sm text-white/70">בחודש · מתוך מחזור של {ils(platformRevenue)}</div>
          </div>

          <div className="rounded-xl bg-white/10 p-4 text-center">
            <div className="text-sm text-white/70">חיסכון נטו אם הלקוחות החוזרים יזמינו ישירות</div>
            <div className="my-1 text-4xl font-extrabold text-white">{ils(netMonthlySaving)}</div>
            <div className="text-sm text-white/70">בחודש · {ils(netYearlySaving)} בשנה</div>
          </div>
        </div>

        {/* The caveat belongs next to the number, not in small print at the
            bottom of the page. An operator who spots the omission stops
            believing the rest of the figures. */}
        <p className="mt-4 text-xs leading-relaxed text-white/60">
          החישוב מנכה {Math.round(PROCESSING_RATE * 100)}% סליקה מכל הזמנה ישירה, כי היא זולה יותר — לא חינם.
          הוא גם לא מניח שתעברו ל-100% ישיר: הפלטפורמות מביאות לקוחות חדשים שלא הכירו אתכם, וזה שווה עמלה.
          הרווח נמצא בלקוחות שכבר חוזרים אליכם ומשלמים דרכן עמלה שלא הייתם צריכים לשלם.
        </p>
      </div>

      {/* Lead form */}
      <div className="rounded-card bg-white p-6 shadow-lg md:p-8">
        {status === "success" ? (
          <div className="py-10 text-center">
            <h3 className="mb-2 text-2xl font-semibold text-brand-dark">קיבלנו! 🎉</h3>
            <p className="text-brand-muted">
              נחזור אליכם עם חישוב לפי המספרים האמיתיים שלכם, ונראה מה אתר הזמנות משלכם מחזיר בפועל.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h3 className="mb-1 text-2xl font-semibold text-brand-dark">רוצים חישוב לפי המספרים שלכם?</h3>
            <p className="mb-6 text-sm text-brand-muted">
              נעבור על העמלות שאתם משלמים בפועל ונראה מה ערוץ ישיר מחזיר — בלי התחייבות.
            </p>
            <div className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" aria-label="שם מלא" autoComplete="name" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""))} placeholder="טלפון" aria-label="טלפון" autoComplete="tel" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
              <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="שם המסעדה" aria-label="שם המסעדה" autoComplete="organization" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
            </div>
            <input type="text" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} name="company_url" tabIndex={-1} autoComplete="off" aria-hidden style={VISUALLY_HIDDEN} />
            {status === "error" && (
              <p className="mt-4 text-sm font-medium text-red-600" role="alert">אנא מלאו שם וטלפון ונסו שוב.</p>
            )}
            <button type="submit" disabled={status === "sending"} className="mt-5 w-full rounded-pill bg-brand-pinkStrong px-9 py-3 font-medium text-white transition hover:bg-brand-pinkInk disabled:opacity-60">
              {status === "sending" ? "שולח…" : "קבלו חישוב מדויק"}
            </button>
            <p className="mt-3 text-center text-xs text-brand-muted">ללא התחייבות · נחזור אליכם תוך יום עסקים</p>
          </form>
        )}
      </div>
    </div>
  );
}
