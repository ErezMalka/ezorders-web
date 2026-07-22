import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10 * 1024;

// --- Basic rate limiting (best-effort, in-memory per instance) ---
// A contact form is submitted rarely, so a small allowance is plenty. This is
// a lightweight guard against bursts/bots — on serverless it only sees traffic
// hitting the same warm instance, so it is a first line of defence, not a hard
// quota. For strict global limits, back this with a shared store (e.g. KV).
const RATE_LIMIT_MAX = 5; // submissions allowed per window, per IP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Returns true when the request is allowed, false when the limit is exceeded.
function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Opportunistic cleanup of expired buckets to keep the map bounded.
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }

  const existing = rateBuckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (existing.count >= RATE_LIMIT_MAX) return false;
  existing.count += 1;
  return true;
}

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
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    console.error("[contact] Rate limit exceeded for " + ip);
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000) } }
    );
  }

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
    return NextResponse.json({ ok: false, error: "Email not configured" }, { status: 500 });
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
