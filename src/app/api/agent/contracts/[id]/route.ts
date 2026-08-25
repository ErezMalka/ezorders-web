import { NextResponse } from "next/server";

import { ContractError, cancelContract, sendContract } from "@/lib/agent/contracts";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Move a contract: send it, or cancel it.
 *
 * There is no edit. A contract's terms come from a template version and its
 * facts from the quote it was drafted from; changing either after the customer
 * has the link would mean the document they are reading is not the one on
 * record. Getting it wrong is a cancel and a new draft, which leaves both in
 * the timeline.
 */
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
      return NextResponse.json({ ok: true, token });
    }
    if (action === "cancel") {
      await cancelContract(id);
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
