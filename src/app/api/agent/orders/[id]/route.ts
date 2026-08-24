import { NextResponse } from "next/server";

import { OrderError, setOrderNotes, setOrderStatus, setTargetLiveOn } from "@/lib/agent/orders";
import { getAgentSession } from "@/lib/agent/session";
import type { OrderStatus } from "@/lib/agent/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["pending_setup", "in_setup", "live", "cancelled"];

/**
 * Move an order along, or annotate it.
 *
 * Unlike the team routes, nothing here uses the service-role key: every write
 * goes through the caller's own Supabase session, so the RLS policy on
 * public.orders is what decides whether this agent may touch this order. The
 * session check below is about giving a signed-out caller a 401 instead of a
 * confusing empty result — it is not the security boundary.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    if (typeof body.status === "string") {
      if (!STATUSES.includes(body.status as OrderStatus)) {
        return NextResponse.json({ error: "סטטוס לא מוכר" }, { status: 400 });
      }
      await setOrderStatus(
        id,
        body.status as OrderStatus,
        session.id,
        typeof body.reason === "string" ? body.reason : undefined
      );
    }

    if ("targetLiveOn" in body) {
      const value = body.targetLiveOn;
      if (value !== null && typeof value !== "string") {
        return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
      }
      await setTargetLiveOn(id, value);
    }

    if (typeof body.notes === "string") {
      await setOrderNotes(id, body.notes);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/orders] update failed", error);
    return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  }
}
