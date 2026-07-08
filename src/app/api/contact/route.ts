import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10 * 1024;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof data.company_url === "string" && data.company_url.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const businessName = typeof data.businessName === "string" ? data.businessName.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const locale = data.locale === "he" ? "he" : data.locale === "en" ? "en" : null;
  const pagePath = typeof data.pagePath === "string" ? data.pagePath : null;
  const utm = data.utm && typeof data.utm === "object" ? data.utm : null;

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (!locale) {
    return NextResponse.json({ ok: false, error: "Invalid locale" }, { status: 400 });
  }

  const webhookUrl = process.env.CRM_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[contact] CRM_LEAD_WEBHOOK_URL is not configured");
    return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
  }

  const payload = {
    name,
    email,
    phone: phone || null,
    businessName: businessName || null,
    message,
    locale,
    source: "ezorders-website",
    pagePath,
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") || null,
    utm: utm || null,
  };

  const headers = { "Content-Type": "application/json" };
  const secret = process.env.CRM_LEAD_WEBHOOK_SECRET;
  if (secret) {
    headers["X-Webhook-Secret"] = secret;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[contact] CRM webhook returned status " + res.status);
      return NextResponse.json({ ok: false, error: "Upstream error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[contact] CRM webhook request failed", err);
    return NextResponse.json({ ok: false, error: "Upstream error" }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
