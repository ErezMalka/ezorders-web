"use client";

import { useMemo, useState } from "react";

// --- Lead attribution helpers (mirror ContactForm) ---
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

const ils = (n: number) =>
  "₪" + Math.round(n).toLocaleString("he-IL");

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
          <span className="mr-1 text-sm font-normal text-white/70">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-pink"
        aria-label={label}
      />
    </div>
  );
}

export function QueueCalculator() {
  const [dailyOrders, setDailyOrders] = useState(150);
  const [avgTicket, setAvgTicket] = useState(48);
  const [waitMinutes, setWaitMinutes] = useState(6);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  // --- Loss model (clearly an estimate) ---
  // Abandonment rises with peak wait time: ~2.5% of customers give up for each
  // minute of wait beyond a 2-minute tolerance, capped at 30%. Directional only.
  const { abandonRate, lostPerDay, monthlyLoss } = useMemo(() => {
    const rate = Math.min(0.3, Math.max(0, (waitMinutes - 2) * 0.025));
    const lost = dailyOrders * rate;
    const monthly = lost * avgTicket * 26; // ~26 trading days
    return { abandonRate: rate, lostPerDay: lost, monthlyLoss: monthly };
  }, [dailyOrders, avgTicket, waitMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const message = [
      "מחשבון התור — תוצאה:",
      `הזמנות ביום: ${dailyOrders}`,
      `ממוצע הזמנה: ${ils(avgTicket)}`,
      `זמן המתנה בשיא: ${waitMinutes} דק'`,
      `הערכת אובדן חודשי: ${ils(monthlyLoss)} (≈ ${Math.round(lostPerDay)} לקוחות/יום)`,
    ].join("\n");
    try {
      const res = await fetch("/api/lead-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: "מחשבון התור",
          name,
          phone,
          businessName: business,
          message,
          company_url: companyUrl,
          gclid: getGclid(),
          utm: getUtm(),
          pagePath: typeof window !== "undefined" ? window.location.pathname : null,
          fields: {
            daily_orders: dailyOrders,
            avg_ticket: avgTicket,
            wait_minutes: waitMinutes,
            est_monthly_loss: Math.round(monthlyLoss),
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) {
        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "lead_submit", form: "queue_calculator" });
          if (typeof window.fbq === "function")
            window.fbq("track", "Lead", { content_name: "queue_calculator" });
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
        <h2 className="mb-1 text-xl font-bold text-white">כמה עולה לך התור?</h2>
        <p className="mb-6 text-sm text-white/70">הזיזו את הסליידרים לפי המסעדה שלכם.</p>
        <div className="space-y-6">
          <Slider label="הזמנות ביום" suffix="הזמנות" min={20} max={600} step={10} value={dailyOrders} onChange={setDailyOrders} />
          <Slider label="ממוצע הזמנה" suffix="₪" min={20} max={150} step={1} value={avgTicket} onChange={setAvgTicket} />
          <Slider label="זמן המתנה בשעות שיא" suffix="דק'" min={1} max={20} step={1} value={waitMinutes} onChange={setWaitMinutes} />
        </div>

        <div className="mt-8 rounded-xl bg-white/10 p-5 text-center">
          <div className="text-sm text-white/70">התור מבריח לך בערך</div>
          <div className="my-1 text-4xl font-extrabold text-white">{ils(monthlyLoss)}</div>
          <div className="text-sm text-white/70">בחודש · ≈ {Math.round(lostPerDay)} לקוחות ביום שלא מחכים</div>
          <div className="mt-3 text-xs text-white/50">
            הערכה בלבד, מבוססת על שיעורי נטישה מקובלים בענף ({Math.round(abandonRate * 100)}% נטישה). ניתוח מדויק בשיחה.
          </div>
        </div>
      </div>

      {/* Lead form */}
      <div className="rounded-card bg-white p-6 shadow-lg md:p-8">
        {status === "success" ? (
          <div className="py-10 text-center">
            <h3 className="mb-2 text-2xl font-semibold text-brand-dark">קיבלנו! 🎉</h3>
            <p className="text-brand-muted">
              נחזור אליכם בהקדם עם ניתוח מדויק כמה קיוסק יכול להחזיר למסעדה שלכם.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h3 className="mb-1 text-2xl font-semibold text-brand-dark">רוצים ניתוח מדויק?</h3>
            <p className="mb-6 text-sm text-brand-muted">
              נראה לכם כמה עמדת קיוסק תחזיר בדיוק למסעדה שלכם — בלי התחייבות.
            </p>
            <div className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" aria-label="שם מלא" autoComplete="name" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""))} placeholder="טלפון" aria-label="טלפון" autoComplete="tel" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
              <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="שם המסעדה" aria-label="שם המסעדה" autoComplete="organization" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20" />
            </div>
            <input type="text" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} name="company_url" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            {status === "error" && (
              <p className="mt-4 text-sm font-medium text-red-600" role="alert">אנא מלאו שם וטלפון ונסו שוב.</p>
            )}
            <button type="submit" disabled={status === "sending"} className="mt-5 w-full rounded-pill bg-brand-pink px-9 py-3 font-medium text-white transition hover:bg-brand-pinkDark disabled:opacity-60">
              {status === "sending" ? "שולח…" : "קבלו ניתוח חינם"}
            </button>
            <p className="mt-3 text-center text-xs text-brand-muted">ללא התחייבות · נחזור אליכם תוך יום עסקים</p>
          </form>
        )}
      </div>
    </div>
  );
}
