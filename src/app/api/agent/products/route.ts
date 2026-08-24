import { NextResponse } from "next/server";

import { ProductError, createProduct } from "@/lib/agent/products";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Add a product to the catalogue.
 *
 * The admin check here is a courtesy, not the boundary: this route runs as the
 * caller's own Supabase session, so the RLS policy on public.products is what
 * actually decides. An agent who reached this endpoint directly would get a
 * permission error from the database, not a product. The check exists so they
 * get a sentence instead.
 */
export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "רק מנהל מערכת יכול לערוך את המחירון" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    const product = await createProduct(body as Parameters<typeof createProduct>[0]);
    return NextResponse.json({ ok: true, id: product.id, key: product.key }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/products] create failed", error);
    return NextResponse.json({ error: "יצירת המוצר נכשלה" }, { status: 500 });
  }
}
