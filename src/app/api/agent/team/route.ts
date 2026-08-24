import { NextResponse } from "next/server";

import { TeamError, createAgent } from "@/lib/agent/team";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create an agent.
 *
 * The admin check is the whole security boundary: createAgent uses the
 * service-role key, which bypasses row-level security. If this check is ever
 * removed, any signed-in agent could mint themselves an admin account.
 */
export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    const member = await createAgent({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      role: body.role,
      password: body.password,
      invitedBy: session.id,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof TeamError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/team] create failed", error);
    return NextResponse.json({ error: "יצירת הסוכן נכשלה" }, { status: 500 });
  }
}
