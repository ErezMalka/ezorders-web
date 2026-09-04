import { NextResponse } from "next/server";
import { Resend } from "resend";

import { sendPriceAlert } from "@/lib/agent/price-alert-email";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { getQuote, markQuoteSent } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";
import { fmt, getDiscount } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deliver a quote to the customer.
 *
 * Two channels, deliberately different in kind:
 *
 *   email    — sent server-side through Resend, the same provider the contact
 *              form already uses.
 *   whatsapp — returns a wa.me link for the agent to open. Sending WhatsApp
 *              from a server needs the Business API and an approved template;
 *              handing the agent a pre-filled message is the honest version of
 *              this feature until that exists.
 *
 * Both link to /q/<token> rather than attaching a file: a link records that the
 * customer opened it, which is the question the agent actually has, and it lets
 * a corrected quote replace the old one at the same address.
 */

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  // Vercel sets the deployment host; fall back to the request's own origin.
  return new URL(request.url).origin;
}

/** Israeli mobile numbers to E.164, which is what wa.me expects. */
function toWhatsappNumber(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

/**
 * The owner hears about a hand-priced quote when it goes out, once.
 *
 * After markQuoteSent, never before: an alert about a quote that then failed
 * to send would be an alert about nothing. Best-effort — the customer already
 * has the quote by the time this runs.
 */
async function alertIfHandPriced(
  quote: NonNullable<Awaited<ReturnType<typeof getQuote>>>,
  session: NonNullable<Awaited<ReturnType<typeof getAgentSession>>>,
  channel: string,
  origin: string
): Promise<void> {
  if (!quote.price_overridden || quote.price_alert_sent_at) return;
  try {
    const catalogue = await loadAgentCatalogue();
    await sendPriceAlert({
      quote,
      agentName: session.fullName,
      agentEmail: session.email ?? null,
      channel,
      quoteUrl: `${origin}/q/${quote.public_token}`,
      portalUrl: `${origin}/he/agent/quotes/${quote.id}`,
      listBaseSetup: catalogue.baseSetup,
      listDiscountPct: getDiscount(Number(quote.monthly_eligible)),
    });
  } catch (error) {
    console.error("[agent/quotes/send] price alert failed", error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { id } = await params;

  let channel = "email";
  try {
    const body = (await request.json()) as { channel?: string };
    if (body.channel === "whatsapp") channel = "whatsapp";
  } catch {
    // default to email
  }

  const quote = await getQuote(id);
  if (!quote) {
    return NextResponse.json({ error: "ההצעה לא נמצאה" }, { status: 404 });
  }

  const publicUrl = `${siteOrigin(request)}/q/${quote.public_token}`;
  const monthly = fmt(Number(quote.monthly_total));
  const setup = fmt(Number(quote.setup_total));

  if (channel === "whatsapp") {
    const number = toWhatsappNumber(quote.customer_phone);
    if (!number) {
      return NextResponse.json({ error: "לא הוזן טלפון ללקוח" }, { status: 400 });
    }

    const text = [
      `שלום${quote.customer_contact ? " " + quote.customer_contact : ""},`,
      ``,
      `מצורפת הצעת המחיר ${quote.quote_number} מ-EZOrders:`,
      `הקמה חד־פעמית ${setup} · ${monthly} לחודש (לפני מע״מ)`,
      ``,
      publicUrl,
    ].join("\n");

    // Mark sent before returning: the agent is about to send it, and a quote
    // stuck on "draft" would keep its own customer link closed.
    await markQuoteSent(id, "whatsapp", session.id);
    await alertIfHandPriced(quote, session, "whatsapp", siteOrigin(request));

    return NextResponse.json({
      ok: true,
      whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
    });
  }

  if (!quote.customer_email) {
    return NextResponse.json({ error: "לא הוזן אימייל ללקוח" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "שליחת מייל אינה מוגדרת בסביבה הזו (RESEND_API_KEY / CONTACT_FROM_EMAIL)" },
      { status: 503 }
    );
  }

  const greeting = quote.customer_contact ? `שלום ${quote.customer_contact},` : "שלום,";
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><body style="margin:0;padding:24px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#191D2A">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
    <p style="font-size:22px;font-weight:800;margin:0 0 18px">EZ<span style="color:#F05D86">ORDERS</span></p>
    <p style="margin:0 0 14px">${greeting}</p>
    <p style="margin:0 0 14px">מצורפת הצעת המחיר <strong>${quote.quote_number}</strong> עבור ${quote.customer_name}.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr><td style="padding:6px 0;color:#5F6575">הקמה חד־פעמית</td>
          <td style="padding:6px 0;text-align:left;font-weight:700">${setup}</td></tr>
      <tr><td style="padding:6px 0;color:#5F6575">תשלום חודשי</td>
          <td style="padding:6px 0;text-align:left;font-weight:700;color:#F05D86">${monthly}</td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:13px;color:#5F6575">המחירים אינם כוללים מע״מ.</p>
    <a href="${publicUrl}" style="display:inline-block;background:#F05D86;color:#fff;text-decoration:none;padding:12px 26px;border-radius:50px;font-weight:600">צפייה בהצעה המלאה</a>
    <p style="margin:22px 0 0;font-size:13px;color:#5F6575">בברכה,<br>${session.fullName} · EZOrders</p>
  </div>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: quote.customer_email,
      replyTo: session.email,
      subject: `הצעת מחיר ${quote.quote_number} — EZOrders`,
      html,
    });

    if (error) {
      console.error("[agent/quotes/send] resend rejected", error);
      return NextResponse.json({ error: "שליחת המייל נכשלה" }, { status: 502 });
    }
  } catch (error) {
    console.error("[agent/quotes/send] resend threw", error);
    return NextResponse.json({ error: "שליחת המייל נכשלה" }, { status: 502 });
  }

  await markQuoteSent(id, "email", session.id);
  await alertIfHandPriced(quote, session, "email", siteOrigin(request));
  return NextResponse.json({ ok: true });
}
