import { NextResponse } from "next/server";

import { getAgentSession } from "@/lib/agent/session";
import { TenbisError, markInstructed } from "@/lib/agent/tenbis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record that the customer has been sent the instructions.
 *
 * This is what turns "nothing has happened yet" into "waiting on them", which
 * is the distinction the provisioning list exists to show. Without it every
 * un-provisioned order looks equally untouched, and the ones where somebody has
 * already done their part are indistinguishable from the ones nobody has
 * started — so both get chased, or neither does.
 *
 * Fired from the copy button rather than from a separate press: an agent who
 * copied the message is an agent who is about to send it, and asking them to
 * then confirm they did is the kind of step people stop doing.
 *
 * As with its siblings, reaching the row at all is the RLS policy's decision.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  try {
    const account = await markInstructed(id, session.id);
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] instruct failed", error);
    return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  }
}
