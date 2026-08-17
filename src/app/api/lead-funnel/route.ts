import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Dedicated endpoint for the interactive lead funnels (queue calculator,
// menu → kiosk mockup). Lower friction than /api/contact: it requires only
// name + phone (email optional), builds a rich human-readable message from the
// funnel's structured data, and forwards the lead into the central AdsHub
// `web-lead` pipe so it triggers the real-time WhatsApp/email alert +
// Speed-to-Lead auto-reply. The structured `fields` object is carried along so
// the lead can be scored (business size, product interest, etc.).

const WEB_LEAD_URL =
  process.env.WEB_LEAD_URL ||
  "https://xequjtoslbhxggmtvjwo.supabase.co/functions/v1/web-lead";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — silently accept bots without forwarding.
  if (s(data.company_url) !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = s(data.name);
  const phone = s(data.phone);
  const email = s(data.email);
  const businessName = s(data.businessName);
  const funnel = s(data.funnel) || "funnel";
  const message = s(data.message);
  const fields = data.fields && typeof data.fields === "object" ? data.fields : null;

  if (!name || !phone) {
    return NextResponse.json({ ok: false, error: "Missing name or phone" }, { status: 400 });
  }

  const secret = process.env.CAPI_FORWARD_SECRET;
  if (!secret) {
    console.error("[lead-funnel] CAPI_FORWARD_SECRET not configured");
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  }

  const gclid = s(data.gclid);
  const submittedAt = new Date().toISOString();

  try {
    await fetch(WEB_LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forward-secret": secret },
      body: JSON.stringify({
        name,
        phone,
        email,
        businessName,
        message,
        brand: "ezorders",
        source_form: `EZ Funnel: ${funnel}`,
        gclid,
        is_google: Boolean(gclid),
        referrer: request.headers.get("referer"),
        pagePath: s(data.pagePath),
        utm: data.utm ?? null,
        userAgent: request.headers.get("user-agent"),
        fields,
        submitted_at: submittedAt,
      }),
    });
  } catch (err) {
    // Never block the user on a downstream hiccup — the lead UX must succeed.
    console.error("[lead-funnel] web-lead forward failed", err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
