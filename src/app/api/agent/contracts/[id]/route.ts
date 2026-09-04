import { NextResponse } from "next/server";

import {
  ContractError,
  cancelContract,
  getContract,
  sendContract,
  setContractNotes,
} from "@/lib/agent/contracts";
import { sendPriceAlert } from "@/lib/agent/price-alert-email";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { getQuote } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";
import { getDiscount } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Move a contract: send it, cancel it, or write the agent's notes on it.
 *
 * The terms and the numbers are still not editable. They come from an approved
 * template version and from the quote the customer already saw, and changing
 * either after the link is out would mean the document being read is not the
 * one on record — that is a cancel and a new draft, which leaves both in the
 * timeline.
 *
 * Notes are the exception, and a narrow one: they are the agent's own words,
 * they are added rather than substituted, and the database refuses them the
 * moment there is a signature.
 */
/**
 * A contract drawn straight from a package never had its quote "sent", so the
 * owner's alert about hand-set prices fires here instead — once, when the
 * contract goes out. For a contract that came from a sent quote the alert has
 * already gone and price_alert_sent_at says so. Best-effort, after the send.
 */
async function alertIfHandPriced(
  contractId: string,
  session: NonNullable<Awaited<ReturnType<typeof getAgentSession>>>,
  request: Request
): Promise<void> {
  try {
    const contract = await getContract(contractId);
    if (!contract) return;
    const quote = await getQuote(contract.quote_id);
    if (!quote || !quote.price_overridden || quote.price_alert_sent_at) return;

    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const catalogue = await loadAgentCatalogue();
    await sendPriceAlert({
      quote,
      agentName: session.fullName,
      agentEmail: session.email ?? null,
      channel: "contract",
      quoteUrl: `${origin}/c/${contract.public_token}`,
      portalUrl: `${origin}/he/agent/contracts/${contractId}`,
      listBaseSetup: catalogue.baseSetup,
      listDiscountPct: getDiscount(Number(quote.monthly_eligible)),
    });
  } catch (error) {
    console.error("[agent/contracts] price alert failed", error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;

  try {
    if (action === "send") {
      const { token } = await sendContract(id);
      await alertIfHandPriced(id, session, request);
      return NextResponse.json({ ok: true, token });
    }
    if (action === "cancel") {
      await cancelContract(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "notes") {
      const payload = body as { notes?: unknown; itemNotes?: unknown };
      const notes = typeof payload.notes === "string" ? payload.notes : "";

      // Only string values, and only from a plain object. The database drops
      // keys that are not lines of the quote; this drops shapes that are not
      // notes at all, so a malformed body is a 400 and not a stored surprise.
      const itemNotes: Record<string, string> = {};
      const raw = payload.itemNotes;
      if (raw !== undefined) {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
        }
        for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
          if (typeof value === "string") itemNotes[key] = value;
        }
      }

      await setContractNotes(id, notes, itemNotes);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/contracts] update failed", error);
    return NextResponse.json({ error: "הפעולה נכשלה" }, { status: 500 });
  }
}
