import { NextResponse } from "next/server";

import { OrderError, acceptQuoteAsAgent } from "@/lib/agent/orders";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES: Record<string, { message: string; status: number }> = {
  forbidden: { message: "ההצעה אינה שלך", status: 403 },
  not_found: { message: "ההצעה לא נמצאה", status: 404 },
  not_sent: { message: "אי אפשר לסגור טיוטה — שלחו אותה קודם", status: 400 },
};

/**
 * Record a yes that arrived by telephone.
 *
 * Most deals close on a call, and refusing to record that would mean the orders
 * list quietly under-counts the business. What this deliberately does NOT do is
 * manufacture evidence: the acceptance is stored with channel='agent', with no
 * signer and no document hash, and the order screen says who recorded it rather
 * than implying the customer signed anything.
 *
 * Authorisation lives inside quote_accept_by_agent(), which compares the quote's
 * owner against auth.uid(). This route runs as the agent, not as the service
 * role, so that comparison is against the real caller.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  let note: string | undefined;
  try {
    const body = (await request.json()) as { note?: unknown };
    if (typeof body.note === "string") note = body.note.slice(0, 500);
  } catch {
    // A body is optional here; an unparseable one is treated as none.
  }

  try {
    const result = await acceptQuoteAsAgent(id, note);

    if (!result.ok) {
      const known = CODES[result.code];
      return NextResponse.json(
        { error: known?.message ?? "רישום האישור נכשל" },
        { status: known?.status ?? 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      // The customer had already answered; say so rather than implying this
      // click is what closed it.
      alreadyAnswered: result.code.startsWith("already_"),
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/quotes/accept] failed", error);
    return NextResponse.json({ error: "רישום האישור נכשל" }, { status: 500 });
  }
}
