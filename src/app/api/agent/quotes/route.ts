import { NextResponse } from "next/server";

import { QuoteValidationError, createQuote, duplicateQuote } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Create a quote for the signed-in agent.
 *
 * The body carries the package SELECTION and the customer's details — never a
 * price. createQuote looks the prices up from PRICING_CONFIG and the database
 * recomputes the totals, so nothing a caller sends can change what a package
 * costs.
 */
export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

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
    // Duplicating is creating: the copy is a new draft with its own number and
    // its own link, priced from today's catalogue. It lives on this route
    // rather than under the source quote because what comes back is a new
    // quote, and the source is left untouched.
    const duplicateOf = (body as { duplicateOf?: unknown }).duplicateOf;
    if (typeof duplicateOf === "string" && duplicateOf) {
      const { quote, dropped } = await duplicateQuote(duplicateOf, session.id);
      return NextResponse.json(
        { id: quote.id, quoteNumber: quote.quote_number, dropped },
        { status: 201 }
      );
    }

    const quote = await createQuote(body as Parameters<typeof createQuote>[0], session.id);
    return NextResponse.json({ id: quote.id, quoteNumber: quote.quote_number }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/quotes] create failed", error);
    return NextResponse.json({ error: "שמירת ההצעה נכשלה" }, { status: 500 });
  }
}
