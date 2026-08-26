import { NextResponse } from "next/server";

import { ContractError, createDirectContract } from "@/lib/agent/contracts";
import { QuoteValidationError } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Draw a contract straight from a package, with no proposal in front of it.
 *
 * The body is the same one the quote builder sends — the SELECTION and the
 * customer, never a price. What comes back is a contract id, because the quote
 * this creates on the way is bookkeeping the agent never sees.
 */
export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

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
    const contract = await createDirectContract(
      body as Parameters<typeof createDirectContract>[0],
      session.id
    );
    return NextResponse.json({ id: contract.id, contractNumber: contract.contractNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteValidationError || error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/contracts] direct create failed", error);
    return NextResponse.json({ error: "הפקת ההסכם נכשלה" }, { status: 500 });
  }
}
