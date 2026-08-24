import { NextResponse } from "next/server";

import { TeamError, resetAgentPassword, setAgentActive, setAgentRole } from "@/lib/agent/team";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update one team member: activate, deactivate, change role, reset password.
 *
 * Everything below the admin check runs with the service-role key, so the check
 * is the boundary. The self-protection rules are separate from the database's
 * last-admin trigger and deliberately so: the trigger stops the system being
 * bricked, these stop an admin quietly locking themselves out one action
 * earlier, while there is still someone to explain it to.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const isSelf = id === session.id;

  try {
    if (typeof body.isActive === "boolean") {
      if (isSelf && body.isActive === false) {
        return NextResponse.json({ error: "אי אפשר להשבית את עצמך" }, { status: 400 });
      }
      await setAgentActive(id, body.isActive);
    }

    if (typeof body.role === "string") {
      if (isSelf && body.role !== "admin") {
        return NextResponse.json({ error: "אי אפשר להוריד את עצמך מתפקיד מנהל" }, { status: 400 });
      }
      await setAgentRole(id, body.role);
    }

    if (typeof body.password === "string") {
      await resetAgentPassword(id, body.password);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeamError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/team] update failed", error);
    return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  }
}
