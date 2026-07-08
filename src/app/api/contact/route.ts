import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10 * 1024;

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
  const utm =
    data.utm && typeof data.utm === "object" ? (data.utm as UtmFields) : null;

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

  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
