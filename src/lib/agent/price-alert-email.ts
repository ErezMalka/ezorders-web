import "server-only";

import { Resend } from "resend";

import { BASE_SETUP_LABEL, fmt } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

import type { QuoteWithItems } from "./quotes";

/**
 * Tell the owner that a quote with hand-set prices went out.
 *
 * Sent once per quote, at the moment it is sent to the customer — not when
 * the draft is saved, because a draft is a thing an agent is still thinking
 * about, and three mails for three saves would teach the recipient to ignore
 * the fourth. What it carries is the comparison the recipient actually wants
 * to make: each line's list price beside the price given, and the two totals.
 *
 * Best-effort by design. The quote has already been sent when this runs;
 * a mail provider having a bad afternoon must not turn that into an error
 * the agent sees. Failures are logged, and price_alert_sent_at stays null so
 * an unsent alert is visible rather than assumed.
 */

const HE_STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Where the alert goes. One address by default; a comma-separated list is fine. */
export function priceAlertRecipients(): string[] {
  const raw = process.env.PRICE_ALERT_TO_EMAIL || "erez@bite.co.il";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function sendPriceAlert(input: {
  quote: QuoteWithItems;
  agentName: string;
  agentEmail: string | null;
  channel: string;
  quoteUrl: string;
  portalUrl: string;
  /** The list's base fee and tier, so the mail can show what the list would have said. */
  listBaseSetup: number;
  listDiscountPct: number;
}): Promise<boolean> {
  const { quote } = input;
  if (!quote.price_overridden) return false;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("[price-alert] not configured (RESEND_API_KEY / CONTACT_FROM_EMAIL)");
    return false;
  }

  const baseGiven = quote.base_setup_override ?? input.listBaseSetup;
  const pctGiven = Number(quote.discount_percent);

  const row = (label: string, list: string, given: string, changed: boolean) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #eef1f5">${escapeHtml(label)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;text-align:center;color:#5F6575">${list}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;text-align:center;font-weight:${changed ? 700 : 400};color:${changed ? "#C92A5C" : "#191D2A"}">${given}</td>
      </tr>`;

  const num = (v: string) => `<span dir="ltr">${escapeHtml(v)}</span>`;
  const money = (n: number) => num(fmt(n));

  const lines = [
    row(
      BASE_SETUP_LABEL,
      money(input.listBaseSetup),
      money(Number(baseGiven)),
      quote.base_setup_override !== null
    ),
    ...quote.items.map((item) => {
      const listSetup = Number(item.list_setup_unit ?? item.setup_unit);
      const listMonthly = Number(item.list_monthly_unit ?? item.monthly_unit);
      const setup = Number(item.setup_unit);
      const monthly = Number(item.monthly_unit);
      const setupChanged = setup !== listSetup;
      const monthlyChanged = monthly !== listMonthly;
      const listText = `${fmt(listSetup)} / ${fmt(listMonthly)} לחודש`;
      const givenText = `${fmt(setup)} / ${fmt(monthly)} לחודש`;
      const label = item.quantity > 1 ? `${item.label} × ${item.quantity}` : item.label;
      return row(label, num(listText), num(givenText), setupChanged || monthlyChanged);
    }),
    row(
      "הנחה על החודשי הזכאי",
      num(`${input.listDiscountPct}%`),
      num(`${pctGiven}%`),
      quote.discount_override_pct !== null
    ),
  ].join("");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><body style="margin:0;padding:24px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#191D2A">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
    <p style="font-size:22px;font-weight:800;margin:0 0 6px">EZ<span style="color:#F05D86">ORDERS</span></p>
    <p style="margin:0 0 18px;font-size:13px;color:#5F6575">התראה אוטומטית מפורטל הסוכנים</p>

    <h1 style="font-size:18px;margin:0 0 6px">${input.channel === "contract" ? "הסכם עם מחיר ידני נשלח ללקוח" : "הצעה עם מחיר ידני נשלחה ללקוח"}</h1>
    <p style="margin:0 0 18px;font-size:14px">
      <b>${escapeHtml(input.agentName)}</b>${input.agentEmail ? ` (${escapeHtml(input.agentEmail)})` : ""}
      שלח/ה ${input.channel === "contract" ? "הסכם" : "הצעה"} <b>${num(quote.quote_number)}</b> ל-<b>${escapeHtml(quote.customer_name)}</b>
      ${escapeHtml(input.channel === "contract" ? "כהסכם ישיר" : input.channel === "whatsapp" ? "בוואטסאפ" : "במייל")},
      ${num(HE_STAMP.format(new Date()))}.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px">
      <thead>
        <tr style="background:#191D2A;color:#fff">
          <th style="padding:8px 10px;text-align:right">רכיב</th>
          <th style="padding:8px 10px;text-align:center">מחירון</th>
          <th style="padding:8px 10px;text-align:center">ניתן בפועל</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 22px">
      <tr><td style="padding:5px 0;color:#5F6575">סה״כ הקמה (חד־פעמי)</td><td style="padding:5px 0;text-align:left;font-weight:700">${money(Number(quote.setup_total))}</td></tr>
      ${Number(quote.hardware_total) > 0 ? `<tr><td style="padding:5px 0;color:#5F6575">מוצרים וחומרה</td><td style="padding:5px 0;text-align:left;font-weight:700">${money(Number(quote.hardware_total))}</td></tr>` : ""}
      <tr><td style="padding:5px 0;color:#5F6575">סה״כ חודשי (אחרי הנחה)</td><td style="padding:5px 0;text-align:left;font-weight:700;color:#F05D86">${money(Number(quote.monthly_total))}</td></tr>
    </table>

    <a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#191D2A;color:#fff;text-decoration:none;padding:11px 22px;border-radius:50px;font-weight:600;font-size:14px">פתיחת ההצעה בפורטל</a>
    <a href="${escapeHtml(input.quoteUrl)}" style="display:inline-block;margin-inline-start:10px;color:#5F6575;font-size:13px">מה הלקוח רואה</a>

    <p style="margin:22px 0 0;font-size:12px;color:#9aa0ad">כל המחירים לפני מע״מ. ההיסטוריה המלאה של השינויים נשמרת על ההצעה בפורטל.</p>
  </div>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: priceAlertRecipients(),
      replyTo: input.agentEmail ?? undefined,
      subject: `מחיר ידני · הצעה ${quote.quote_number} · ${quote.customer_name} · ${input.agentName}`,
      html,
    });
    if (error) {
      console.error("[price-alert] resend rejected", error);
      return false;
    }
  } catch (error) {
    console.error("[price-alert] resend threw", error);
    return false;
  }

  // Service role: the quote has left draft by now, and the stamp is
  // bookkeeping about the mail, not an edit to the deal.
  await createSupabaseAdminClient()
    .from("quotes")
    .update({ price_alert_sent_at: new Date().toISOString() })
    .eq("id", quote.id);
  return true;
}
