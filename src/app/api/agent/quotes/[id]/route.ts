import { NextResponse } from "next/server";

import { QuoteValidationError, updateQuote } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Rewrite a draft quote.
 *
 * Same contract as creating one: the body carries the SELECTION and the
 * customer, never a price. updateQuote looks the prices up from the catalogue
 * an agent may sell and the database recomputes the totals.
 *
 * There is no PATCH for a quote that has been sent, and no flag that turns one
 * on. The customer is reading that document at their own link, and a signature
 * is a hash of it; a quote that has left draft is copied, not corrected.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "הבקשה גדולה מדי" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    const quote = await updateQuote(id, body as Parameters<typeof updateQuote>[1], session.id);
    return NextResponse.json({ id: quote.id, quoteNumber: quote.quote_number });
  } catch (error) {
    if (error instanceof QuoteValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/quotes] update failed", error);
    return NextResponse.json({ error: "עדכון ההצעה נכשל" }, { status: 500 });
  }
}
