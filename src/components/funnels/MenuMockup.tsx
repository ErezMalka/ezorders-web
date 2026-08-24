"use client";

import { useRef, useState } from "react";
import { VISUALLY_HIDDEN } from "@/lib/visually-hidden";

// Public Supabase anon credentials — safe to expose (anon role, RLS-guarded).
// The ad-media bucket allows anonymous inserts of jpeg/png, so the uploaded
// menu image goes straight to storage and only its URL travels with the lead.
const SB_URL = "https://xequjtoslbhxggmtvjwo.supabase.co";
const SB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlcXVqdG9zbGJoeGdnbXR2andvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTIzMTQsImV4cCI6MjEwMDg2ODMxNH0.c6S26Moki-pOP5hVzZbReCjPIRPF4cxcIZ2JYpu-P48";

function getGclid(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("gclid");
  if (fromUrl) return fromUrl;
  const m = document.cookie.match(/(?:^|;\s*)_gcl_aw=GCL\.\d+\.([^;]+)/);
  return m ? m[1] : "";
}

async function uploadMenu(file: File): Promise<string | null> {
  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `menus/menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SB_URL}/storage/v1/object/ad-media/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SB_ANON}`,
      apikey: SB_ANON,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) return null;
  return `${SB_URL}/storage/v1/object/public/ad-media/${key}`;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20";

export function MenuMockup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");

    let menuUrl = "";
    if (file) {
      try {
        menuUrl = (await uploadMenu(file)) || "";
      } catch {
        menuUrl = "";
      }
    }

    const message = [
      "שלח תפריט → הדמיית קיוסק",
      `שם המסעדה: ${business || "-"}`,
      menuUrl ? `תפריט שהועלה: ${menuUrl}` : "תפריט: לא הועלה (לתאם בשיחה)",
    ].join("\n");

    try {
      const res = await fetch("/api/lead-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: "שלח תפריט - הדמיה",
          name,
          phone,
          businessName: business,
          message,
          company_url: companyUrl,
          gclid: getGclid(),
          pagePath: typeof window !== "undefined" ? window.location.pathname : null,
          fields: { menu_url: menuUrl, has_menu: Boolean(menuUrl) },
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) {
        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "lead_submit", form: "menu_mockup" });
          if (typeof window.fbq === "function")
            window.fbq("track", "Lead", { content_name: "menu_mockup" });
        }
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-card bg-white p-8 text-center shadow-lg">
        <h3 className="mb-2 text-2xl font-semibold text-brand-dark">התפריט התקבל! 🎉</h3>
        <p className="text-brand-muted">
          נבנה לכם הדמיה של המסעדה בעמדת קיוסק ונשלח אליכם בוואטסאפ בקרוב.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-card bg-white p-6 shadow-lg md:p-8">
      <h3 className="mb-1 text-2xl font-semibold text-brand-dark">שלחו תפריט → קבלו הדמיה</h3>
      <p className="mb-6 text-sm text-brand-muted">
        העלו תמונה של התפריט, ונבנה לכם הדמיה איך המסעדה שלכם נראית בעמדת קיוסק — חינם.
      </p>

      <div className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" aria-label="שם מלא" autoComplete="name" className={inputClass} />
        <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""))} placeholder="טלפון" aria-label="טלפון" autoComplete="tel" className={inputClass} />
        <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="שם המסעדה" aria-label="שם המסעדה" autoComplete="organization" className={inputClass} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 text-sm font-medium text-brand-muted transition hover:border-brand-pink hover:text-brand-pink"
        >
          {file ? `✓ ${file.name}` : "📷 העלו תמונה של התפריט (JPG/PNG)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <input type="text" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} name="company_url" tabIndex={-1} autoComplete="off" aria-hidden style={VISUALLY_HIDDEN} />

      {status === "error" && (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">אנא מלאו שם וטלפון ונסו שוב.</p>
      )}

      <button type="submit" disabled={status === "sending"} className="mt-5 w-full rounded-pill bg-brand-pink px-9 py-3 font-medium text-white transition hover:bg-brand-pinkDark disabled:opacity-60">
        {status === "sending" ? "שולח…" : "קבלו הדמיה חינם"}
      </button>
      <p className="mt-3 text-center text-xs text-brand-muted">אין תפריט מוכן? השאירו פרטים ונתאם בשיחה.</p>
    </form>
  );
}
