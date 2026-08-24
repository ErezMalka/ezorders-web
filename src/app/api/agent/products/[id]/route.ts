import { NextResponse } from "next/server";

import { ProductError, updateProduct } from "@/lib/agent/products";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Edit one product: price, label, order, whether it is still sold, whether it
 * appears on the public calculator.
 *
 * There is no DELETE, and that is deliberate. Every stored quote line refers to
 * a product by key. Removing the row would not corrupt those lines — labels and
 * prices are frozen onto them at issue time — but it would erase the only record
 * of what the key ever meant, which is exactly what someone reading a two-year-old
 * quote needs. Retiring sets is_active false: the product stops appearing
 * anywhere it can be sold, and stays legible everywhere it was.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "רק מנהל מערכת יכול לערוך את המחירון" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    await updateProduct(id, body as Parameters<typeof updateProduct>[1]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProductError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/products] update failed", error);
    return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  }
}
