import { NextResponse } from "next/server";

import { getAgentSession } from "@/lib/agent/session";
import {
  TenbisError,
  getTenbisAccount,
  orderHasTenbis,
  saveTenbisAccount,
  tenbisEnabled,
} from "@/lib/agent/tenbis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A customer's תן ביס credentials, read and written.
 *
 * As everywhere else in this portal, nothing here uses the service-role key:
 * both calls go through the caller's own Supabase session, so the RLS policy on
 * tenbis_accounts — which reaches through to the order — is what decides
 * whether this agent may touch this customer. The session check is there to
 * give a signed-out caller a 401 rather than an empty result; it is not the
 * boundary.
 *
 * That distinction is the whole reason this feature exists in this shape. The
 * implementation it borrows from does put its check in the route, and the check
 * reads a branch id out of the request body without ever asking whether the
 * caller owns it.
 *
 * The password is accepted and never returned. GET answers `hasPassword`, and
 * there is no route anywhere that hands one back.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  try {
    const [sold, account] = await Promise.all([orderHasTenbis(id), getTenbisAccount(id)]);
    return NextResponse.json({
      sold,
      configured: tenbisEnabled(),
      account,
    });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] load failed", error);
    return NextResponse.json({ error: "לא הצלחנו לטעון את הגדרות תן ביס" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const user = typeof body.user === "string" ? body.user : "";
  const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : "";
  if (!user.trim() || !restaurantId.trim()) {
    return NextResponse.json({ error: "שם משתמש ומזהה מסעדה הם שדות חובה" }, { status: 400 });
  }

  // Absent leaves the stored password alone; a form that shows no password must
  // not silently clear one by being submitted.
  const password = typeof body.password === "string" ? body.password : undefined;

  let biteBranchId: number | null | undefined;
  if ("biteBranchId" in body) {
    const raw = body.biteBranchId;
    if (raw === null || raw === "") {
      biteBranchId = null;
    } else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: "מזהה סניף לא תקין" }, { status: 400 });
      }
      biteBranchId = n;
    }
  }

  try {
    const account = await saveTenbisAccount(
      id,
      { user, password, restaurantId, biteBranchId },
      session.id,
    );
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] save failed", error);
    return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  }
}
