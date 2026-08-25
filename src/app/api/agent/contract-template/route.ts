import { NextResponse } from "next/server";

import { ContractError, approveTemplate, publishTemplateVersion } from "@/lib/agent/contracts";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The terms of the contract: approve a version, or publish a new one.
 *
 * Admin only, and the database says the same thing — the write policy on
 * contract_templates checks is_admin(). An agent who could edit the terms could
 * sell a different contract than the one the company agreed to.
 */
export async function PATCH(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) {
    return NextResponse.json({ error: "רק מנהל מערכת יכול לאשר נוסח הסכם" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const version = Number((body as { version?: unknown })?.version);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: "מספר גרסה לא תקין" }, { status: 400 });
  }

  try {
    await approveTemplate(version, session.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/contract-template] approve failed", error);
    return NextResponse.json({ error: "האישור נכשל" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  if (!session.isAdmin) {
    return NextResponse.json({ error: "רק מנהל מערכת יכול לערוך את נוסח ההסכם" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  try {
    const version = await publishTemplateVersion(
      body as Parameters<typeof publishTemplateVersion>[0]
    );
    return NextResponse.json({ ok: true, version }, { status: 201 });
  } catch (error) {
    if (error instanceof ContractError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/contract-template] publish failed", error);
    return NextResponse.json({ error: "שמירת הנוסח נכשלה" }, { status: 500 });
  }
}
