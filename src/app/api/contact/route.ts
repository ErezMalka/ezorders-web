import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10 * 1024;
const LEAD_EMAIL = process.env.CONTACT_TO_EMAIL || "contact@ezorders.com";
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/" + LEAD_EMAIL;

type UtmFields = Record<string, string | null>;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  businessName?: unknown;
  message?: unknown;
  locale?: unknown;
  pagePath?: unknown;
  utm?: unknown;
  company_url?: unknown;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  let data: ContactPayload;
  try {
    data = JSON.parse(raw) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: silently accept bot submissions without forwarding them.
  const companyUrl = asString(data.company_url);
  if (companyUrl !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = asString(data.name);
  const email = asString(data.email);
  const phone = asString(data.phone);
  const businessName = asString(data.businessName);
  const message = asString(data.message);
  const locale = data.locale === "he" ? "he" : data.locale === "en" ? "en" : null;
  const pagePath = typeof data.pagePath === "string" ? data.pagePath : null;
  const utm = data.utm && typeof data.utm === "object" ? (data.utm as UtmFields) : null;

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (!locale) {
    return NextResponse.json({ ok: false, error: "Invalid locale" }, { status: 400 });
  }

  const submittedAt = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") || null;

  // --- Primary channel: email to the EzOrders inbox via FormSubmit ---
  const utmSummary = utm
    ? Object.entries(utm)
        .filter(([, v]) => typeof v === "string" && v)
        .map(([k, v]) => k + "=" + v)
        .join(", ")
    : "";

  const emailBody: Record<string, string> = {
    _subject: "פנייה חדשה מאתר EzOrders — " + name,
    _template: "table",
    _replyto: email,
    "שם מלא": name,
    "אימייל": email,
    "טלפון": phone || "-",
    "שם העסק": businessName || "-",
    "הודעה": message,
    "שפה": locale,
    "עמוד": pagePath || "-",
    "נשלח בתאריך": submittedAt,
  };
  if (utmSummary) {
    emailBody["UTM"] = utmSummary;
  }

  let emailOk = false;

  // --- Preferred channel: Resend (reliable, no activation flow). Active only
  // when RESEND_API_KEY is configured in the environment (e.g. on Vercel).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const fromAddress = process.env.CONTACT_FROM_EMAIL || "EzOrders Website <onboarding@resend.dev>";
    const textLines = [
      "שם מלא: " + name,
      "אימייל: " + email,
      "טלפון: " + (phone || "-"),
      "שם העסק: " + (businessName || "-"),
      "",
      "הודעה:",
      message,
      "",
      "שפה: " + locale,
      "עמוד: " + (pagePath || "-"),
      "נשלח בתאריך: " + submittedAt,
    ];
    if (utmSummary) textLines.push("UTM: " + utmSummary);
    try {
      const res = await fetchWithTimeout(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + resendKey,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [LEAD_EMAIL],
            reply_to: email,
            subject: "פנייה חדשה מאתר EzOrders — " + name,
            text: textLines.join("\n"),
          }),
        },
        10000
      );
      emailOk = res.ok;
      if (!res.ok) {
        console.error("[contact] Resend returned status " + res.status);
      }
    } catch (err) {
      console.error("[contact] Resend request failed", err);
    }
  }

  if (!emailOk) {
  try {
    const res = await fetchWithTimeout(
      FORMSUBMIT_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(emailBody),
      },
      10000
    );
    emailOk = res.ok;
    if (!res.ok) {
      console.error("[contact] FormSubmit AJAX returned status " + res.status);
    }
  } catch (err) {
    console.error("[contact] FormSubmit AJAX request failed", err);
  }
  }

  // Fallback: regular (non-AJAX) FormSubmit endpoint. This path works even
  // before the address is activated and triggers the activation email.
  if (!emailOk) {
    try {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(emailBody)) {
        form.append(k, v);
      }
      form.append("_captcha", "false");
      const res = await fetchWithTimeout(
        "https://formsubmit.co/" + LEAD_EMAIL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        },
        10000
      );
      emailOk = res.ok;
      if (!res.ok) {
        console.error("[contact] FormSubmit form endpoint returned status " + res.status);
      }
    } catch (err) {
      console.error("[contact] FormSubmit form endpoint failed", err);
    }
  }

  // --- Secondary channel (optional): CRM webhook, if configured ---
  let webhookOk = false;
  const webhookUrl = process.env.CRM_LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    const payload = {
      name,
      email,
      phone: phone || null,
      businessName: businessName || null,
      message,
      locale,
      source: "ezorders-website",
      pagePath,
      submittedAt,
      userAgent,
      utm: utm || null,
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.CRM_LEAD_WEBHOOK_SECRET;
    if (secret) {
      headers["X-Webhook-Secret"] = secret;
    }
    try {
      const res = await fetchWithTimeout(
        webhookUrl,
        { method: "POST", headers, body: JSON.stringify(payload) },
        8000
      );
      webhookOk = res.ok;
      if (!res.ok) {
        console.error("[contact] CRM webhook returned status " + res.status);
      }
    } catch (err) {
      console.error("[contact] CRM webhook request failed", err);
    }
  }

  if (emailOk || webhookOk) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Upstream error" }, { status: 502 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
