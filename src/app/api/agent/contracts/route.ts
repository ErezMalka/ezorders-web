import { NextResponse } from "next/server";

import { ContractError, createContractFromQuote } from "@/lib/agent/contracts";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Draft a contract from a quote.
 *
 * The session check here is a courtesy: this route runs as the caller's own
 * Supabase session, and create_contract_from_quote makes the decisions that
 * matter — whose quote it is, whether it was sent, whether a human approved the
 * terms. The check exists so an unauthenticated request gets a sentence rather
 * than a database error.
 */
export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const quoteId = (body as { quoteId?: unknown })?.quoteId;
  if (typeof quoteId !== "string" || quoteId.length === 0) {
    return NextResponse.json({ error: "חסר מזהה הצעה" }, { status: 400 });
  }

  try {
    const contract = await createContractFromQuote(quoteId);
    return NextResponse.json({ ok: true, ...contract }, { status: contract.existed ? 200 : 201 });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/contracts] create failed", error);
    return NextResponse.json({ error: "הפקת ההסכם נכשלה" }, { status: 500 });
  }
}
