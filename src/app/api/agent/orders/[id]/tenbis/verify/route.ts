import { NextResponse } from "next/server";

import { getAgentSession } from "@/lib/agent/session";
import { TenbisError, verifyTenbisAccount } from "@/lib/agent/tenbis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Log in to תן ביס with the stored credentials and say whether they work.
 *
 * This is the point of doing any of this inside the portal: the agent finds out
 * now, while the customer is still on the phone, instead of three weeks later
 * when somebody tries to finish the onboarding and nobody remembers which
 * password was sent.
 *
 * Reaching the row at all is the RLS policy's decision, exactly as in the sibling
 * route — a caller who does not own this order gets "no credentials" rather than
 * somebody else's verification.
 *
 * The answer distinguishes who is at fault, and that is carried through to the
 * response on purpose. `blame: "customer"` means go back to them; `"service"`
 * means תן ביס is unreachable and nobody should be chased. Collapsing the two
 * would turn an outage into a phone call to a restaurant.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await verifyTenbisAccount(id);
    if (result.ok) return NextResponse.json({ ok: true });

    // 200 with ok:false, not an error status: a refused password is an answer
    // to the question that was asked, not a failure of the request. The screen
    // renders it either way, and a 4xx here would have the browser's own error
    // handling talk over a perfectly good Hebrew sentence from תן ביס.
    return NextResponse.json({ ok: false, message: result.message, blame: result.blame });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] verify failed", error);
    return NextResponse.json({ error: "הבדיקה נכשלה" }, { status: 500 });
  }
}
