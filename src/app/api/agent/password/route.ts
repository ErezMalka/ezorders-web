import { NextResponse } from "next/server";

import { clearMustChangePassword } from "@/lib/agent/team";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clear the must-change-password flag for the caller.
 *
 * Only ever for the caller's own row — the id comes from the verified session,
 * never from the request — and only after Auth has already accepted the new
 * password client-side. This endpoint cannot set a password, so calling it
 * without changing one just clears a flag on an account you already control.
 */
export async function POST() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  try {
    await clearMustChangePassword(session.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[agent/password] clear flag failed", error);
    return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  }
}
