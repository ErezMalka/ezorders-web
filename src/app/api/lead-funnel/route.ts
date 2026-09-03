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

// Meta Conversions API, via the same Supabase relay /api/contact uses: the Meta
// token stays in Supabase, only the forwarding secret lives here. Paid social
// traffic lands on these pages, so the server-side Lead is what keeps the
// conversion reported when the browser Pixel is blocked. Deduplicated against
// the browser event by the shared `eventId`.
const META_CAPI_RELAY_URL =
  process.env.META_CAPI_RELAY_URL ||
  "https://xequjtoslbhxggmtvjwo.supabase.co/functions/v1/meta-capi";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
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
  const eventId = s(data.eventId);
  const pagePath = s(data.pagePath);
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
        eventId,
        referrer: request.headers.get("referer"),
        pagePath,
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

  // Server-side Lead for Meta. Only when the page supplied an event id, so the
  // browser Pixel event and this one collapse into a single conversion.
  if (eventId) {
    try {
      await fetch(META_CAPI_RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forward-secret": secret },
        body: JSON.stringify({
          email,
          phone,
          eventId,
          eventSourceUrl:
            request.headers.get("referer") ||
            (pagePath ? `https://ezorders.com${pagePath}` : "https://ezorders.com"),
          clientIp: clientIp(request),
          userAgent: request.headers.get("user-agent"),
        }),
      });
    } catch (err) {
      console.error("[lead-funnel] Meta CAPI relay failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
