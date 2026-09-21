import { NextResponse } from "next/server";

import { getAgentSession } from "@/lib/agent/session";
import { TenbisError, getOrderPhone, getTenbisAccount, setBiteBranch } from "@/lib/agent/tenbis";
import { findBranchById, loadBranchCache, matchBranches, type BranchSuggestion } from "@/lib/bite-branches";
import { createCrmClient, crmEnabled } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which branch in the operational system this order is, suggested and then
 * confirmed.
 *
 * GET proposes, POST records. The split is the whole design: the portal can
 * find the branch by matching the order's phone against the CRM's branch cache,
 * but a phone number is evidence and not proof — a chain with four branches on
 * one switchboard number is ordinary — and what gets written against the answer
 * is another company's credentials. So a person looks at the candidates, and
 * the id stored afterwards is a fact rather than a heuristic.
 *
 * The ownership boundary is the same one as everywhere else in this feature and
 * is not restated here: the phone is read through the caller's own session, so
 * an agent who cannot see the order gets no phone and therefore no candidates,
 * and the write goes through the RLS policy on tenbis_accounts. The CRM client
 * below does hold a service key — which is why it is only ever handed a phone
 * that the caller's own session already yielded, and never an id out of the
 * request.
 *
 * The CRM being unreachable or unconfigured is not an error. Delivery stays
 * manual for that order and every other part of the feature still works, so the
 * answer says `crmConfigured: false` and the screen offers the id field.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;

  try {
    const [phone, account] = await Promise.all([getOrderPhone(id), getTenbisAccount(id)]);

    if (!crmEnabled()) {
      return NextResponse.json({ crmConfigured: false, phone, suggestions: [], current: null });
    }

    const crm = createCrmClient();

    // Resolving the stored id costs a second query and buys the thing that
    // makes a confirmation checkable later: a number alone says nothing, and
    // "1180 — ג׳פניקה רעננה" says whether somebody confirmed the right one.
    const current: BranchSuggestion | null = account?.bite_branch_id
      ? await findBranchById(crm, account.bite_branch_id)
      : null;

    const suggestions = phone ? matchBranches(await loadBranchCache(crm), phone) : [];

    return NextResponse.json({ crmConfigured: true, phone, suggestions, current });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] branch lookup failed", error);
    return NextResponse.json({ error: "לא הצלחנו לאתר את הסניף" }, { status: 500 });
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

  const raw = body.biteBranchId;
  let biteBranchId: number | null;
  if (raw === null || raw === "") {
    // Clearing it is a legitimate thing to want: a confirmation made from the
    // wrong candidate should be removable without inventing a replacement.
    biteBranchId = null;
  } else {
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "מזהה סניף לא תקין" }, { status: 400 });
    }
    biteBranchId = n;
  }

  try {
    const account = await setBiteBranch(id, biteBranchId, session.id);

    // Answer with the name too, so a confirmation shows what it confirmed
    // rather than the number that was just posted back.
    let current: BranchSuggestion | null = null;
    if (biteBranchId !== null && crmEnabled()) {
      try {
        current = await findBranchById(createCrmClient(), biteBranchId);
      } catch {
        // The branch is saved. Not being able to name it is a worse answer, not
        // a failed request.
      }
    }

    return NextResponse.json({ account, current });
  } catch (error) {
    if (error instanceof TenbisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[agent/tenbis] branch save failed", error);
    return NextResponse.json({ error: "שמירת הסניף נכשלה" }, { status: 500 });
  }
}
