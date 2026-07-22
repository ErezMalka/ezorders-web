import { NextResponse } from "next/server";
import { Resend } from "resend";

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

  // Honeypot: silently accept bot submissions without sending anything.
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

  // --- Validation ---
  if (!name || !email || !message) {
    console.error("[contact] Validation failed: missing required fields", {
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      hasMessage: Boolean(message),
    });
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    console.error("[contact] Validation failed: invalid email");
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  // --- Environment ---
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.CONTACT_FROM_EMAIL;
  const toAddress = process.env.CONTACT_TO_EMAIL;
  if (!resendKey || !fromAddress || !toAddress) {
    console.error("[contact] Missing email configuration", {
      hasApiKey: Boolean(resendKey),
      hasFrom: Boolean(fromAddress),
      hasTo: Boolean(toAddress),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Email not configured",
        // Diagnostic (booleans only, no secret values) — remove after verifying.
        seen: {
          hasApiKey: Boolean(resendKey),
          hasFrom: Boolean(fromAddress),
          hasTo: Boolean(toAddress),
        },
      },
      { status: 500 }
    );
  }

  const submittedAt = new Date().toISOString();
  const utmSummary = utm
    ? Object.entries(utm)
        .filter(([, v]) => typeof v === "string" && v)
        .map(([k, v]) => k + "=" + v)
        .join(", ")
    : "";

  const textLines = [
    "שם מלא: " + name,
    "אימייל: " + email,
    "טלפון: " + (phone || "-"),
    "שם העסק: " + (businessName || "-"),
    "",
    "הודעה:",
    message,
    "",
    "שפה: " + (locale || "-"),
    "עמוד: " + (pagePath || "-"),
    "נשלח בתאריך: " + submittedAt,
  ];
  if (utmSummary) textLines.push("UTM: " + utmSummary);

  // --- Send via Resend ---
  const resend = new Resend(resendKey);
  const { data: sent, error } = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: email,
    subject: "ליד חדש מהאתר: " + name,
    text: textLines.join("\n"),
  });

  if (error) {
    console.error("[contact] Resend error", error);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: sent?.id }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
