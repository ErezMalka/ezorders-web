import { NextResponse } from "next/server";

import { getAgentSession } from "@/lib/agent/session";
import { TenbisError, deliverTenbisAccount } from "@/lib/agent/tenbis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Write the credentials into the operational system, and record that it
 * happened.
 *
 * The last hop of a sale that until now ended with somebody retyping a password
 * out of an email. A button rather than an automatic consequence of a
 * successful verification: this writes into another company-critical system
 * against a branch a person confirmed, and a write like that should be somebody
 * pressing something.
 *
 * Every precondition lives in the module, not here — configured, a confirmed
 * branch, credentials that were actually proven. A route that enforced them
 * would be a second copy of the rules, and the copy that drifts. Reaching the
 * row at all remains the RLS policy's decision, as everywhere else in this
 * feature.
 *
 * The failure log carries a message and never an error object: a plaintext
 * password travels through this call, and a logged payload is the classic way
 * one ends up somewhere it cannot be taken back from.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  try {
    const account = await deliverTenbisAccount(id, session.id);
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(
      "[agent/tenbis] delivery failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "ההעברה נכשלה" }, { status: 500 });
  }
}
