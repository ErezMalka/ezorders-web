import "server-only";

import { createHash } from "node:crypto";

import {
  GrowError,
  createPaymentLink,
  createPaymentProcess,
  getPaymentProcessInfo,
  growEnabled,
  growFullName,
  growLinkEnabled,
  growPhone,
  type GrowNotification,
} from "@/lib/grow";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Paying for a signed contract.
 *
 * The one-time part of a deal — the hardware and the setup — is paid by card
 * through GROW. This module owns the link: it decides the default amount,
 * asks GROW for a page, keeps the row, and turns GROW's notification into a
 * "paid" that the agent's page and the customer's page both read.
 *
 * Writes go through the service role, because the customer holds a token and
 * not a session, and because GROW's callback holds nothing at all. Every
 * caller with a session has already been through getContract(), whose RLS is
 * what says the agent may see this contract; the functions here re-check the
 * contract's state, never its ownership.
 */

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "ממתין לתשלום",
  paid: "שולם",
  failed: "נכשל",
  cancelled: "בוטל",
};

export interface ContractPaymentRow {
  id: string;
  contract_id: string;
  amount: number;
  currency: string;
  max_installments: number;
  status: PaymentStatus;
  grow_process_id: string | null;
  grow_process_token: string | null;
  payment_url: string | null;
  grow_transaction_id: string | null;
  grow_transaction_token: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** What this link covers, read the way the customer reads it. Null = the whole bill. */
  for_label: string | null;
  /** The same thing as keys, which is what a selection is matched against. */
  part_keys: string[] | null;
}

export class PaymentError extends Error {}

const PAYMENT_COLUMNS =
  "id, contract_id, amount, currency, max_installments, status, grow_process_id, grow_process_token, " +
  "payment_url, grow_transaction_id, grow_transaction_token, paid_at, created_by, created_at, updated_at, " +
  "for_label, part_keys";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function paymentsEnabled(): boolean {
  return growEnabled();
}

/**
 * The default: everything paid once, with VAT on top. The monthly fee is
 * billed separately once the system is live, so it is not in here.
 */
export function defaultPaymentAmount(quote: {
  setup_total: number | string;
  hardware_total: number | string | null;
  vat_percent: number | string;
}): number {
  const oneTime = Number(quote.setup_total) + Number(quote.hardware_total ?? 0);
  const vat = Number(quote.vat_percent) || 0;
  return round2(oneTime * (1 + vat / 100));
}

// ── reading ──────────────────────────────────────────────────────────────────

/** Every link ever made for the contract, newest first, as the agent may see it. */
export async function listContractPayments(contractId: string): Promise<ContractPaymentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contract_payments")
    .select(PAYMENT_COLUMNS)
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load the payments: ${error.message}`);
  return (data ?? []) as unknown as ContractPaymentRow[];
}

/** The link that counts: the newest one that was not cancelled. Service role. */
async function currentPayment(contractId: string): Promise<ContractPaymentRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contract_payments")
    .select(PAYMENT_COLUMNS)
    .eq("contract_id", contractId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the payment: ${error.message}`);
  return (data as unknown as ContractPaymentRow | null) ?? null;
}

/**
 * Where a contract stands when its money can arrive in more than one piece.
 *
 * A customer may want to put ₪1,000 on a card and send ₪1,500 by transfer, and
 * GROW cannot do that on one link — its documentation has no partial payment,
 * no open amount, and a product price is fixed. So a split is two links, which
 * makes "is this contract paid" a question about a sum rather than about a row.
 */
export type ContractStanding = "unpaid" | "partial" | "paid";

export interface PaymentTotals {
  /** The one-time total the contract was priced at, VAT included. */
  due: number;
  /** Actually received. */
  paid: number;
  /** Still owed. Never negative — an overpayment is a conversation, not a debt. */
  outstanding: number;
  /** Owed and already has a live link waiting for the customer. */
  awaiting: number;
  /** Owed with no link yet: what a new link may be worth, at most. */
  unclaimed: number;
  standing: ContractStanding;
}

export async function contractPaymentTotals(contractId: string): Promise<PaymentTotals | null> {
  const contract = await loadContractForPayment({ id: contractId });
  if (!contract?.quote) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contract_payments")
    .select("amount, status")
    .eq("contract_id", contractId)
    .neq("status", "cancelled");

  const rows = (data ?? []) as Array<{ amount: number | string; status: PaymentStatus }>;
  const sum = (s: PaymentStatus) =>
    round2(rows.filter((r) => r.status === s).reduce((t, r) => t + Number(r.amount), 0));

  const due = defaultPaymentAmount(contract.quote);
  const paid = sum("paid");
  const awaiting = sum("pending");
  const outstanding = round2(Math.max(0, due - paid));

  return {
    due,
    paid,
    outstanding,
    awaiting,
    unclaimed: round2(Math.max(0, outstanding - awaiting)),
    // Anything received at all, short of the whole, is "partial" — an agent who
    // reads "ממתין לתשלום" on a contract that has already paid half will chase
    // a customer who owes nothing yet.
    standing: outstanding <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
  };
}

/**
 * The one-time total, broken into the pieces a customer can recognise.
 *
 * Splitting by amount asks a customer to verify an arbitrary number: "₪1,000 of
 * ₪2,879" is checkable only with a calculator and trust. Splitting by what they
 * bought is self-evident — "הקמה" on one card, "עמדה" on another — and it is
 * what an owner actually says out loud when they ask to split a bill.
 *
 * The decomposition, verified against four live quotes rather than assumed:
 *   hardware_total = the sum of the hardware items exactly
 *   setup_total    = a base setup fee + the setup of every non-hardware item
 * so the base fee is what is left of setup_total once the items are taken out.
 * It is derived here and never hardcoded, because it is a pricing setting and
 * pricing settings move.
 */
export interface PayablePart {
  /** Stable across reloads, so a selection survives one. */
  key: string;
  label: string;
  /** VAT included, and the parts sum to the contract total exactly. */
  amount: number;
  /**
   * Already settled, or already sitting in a link somebody is waiting on.
   *
   * Without this the picker offered everything, the server refused whatever
   * overlapped a live link, and the agent read "the selection exceeds the
   * balance" with no way to see which item was the problem. A part that cannot
   * be picked has to say so itself.
   */
  claimedBy?: { status: PaymentStatus; paymentId: string } | null;
}

export async function contractPayableParts(contractId: string): Promise<PayablePart[]> {
  const admin = createSupabaseAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("quote_id")
    .eq("id", contractId)
    .is("deleted_at", null)
    .maybeSingle();
  const quoteId = (contract as { quote_id: string | null } | null)?.quote_id;
  if (!quoteId) return [];

  const { data: quoteRow } = await admin
    .from("quotes")
    .select("setup_total, hardware_total, vat_percent")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quoteRow) return [];
  const quote = quoteRow as { setup_total: number | string; hardware_total: number | string | null; vat_percent: number | string };

  const { data: itemRows } = await admin
    .from("quote_items")
    .select("id, label, item_group, setup_total, sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  const items = ((itemRows ?? []) as Array<{
    id: string; label: string; item_group: string; setup_total: number | string;
  }>).filter((i) => Number(i.setup_total) > 0);

  // Pre-VAT, because VAT is applied to the whole and then shared out — adding
  // VAT per part and summing drifts from the contract total by a few agorot.
  const nonHardware = items.filter((i) => i.item_group !== "hardware");
  const itemsNet = nonHardware.reduce((t, i) => t + Number(i.setup_total), 0);
  const baseNet = round2(Number(quote.setup_total) - itemsNet);

  const net: Array<{ key: string; label: string; value: number }> = [];
  if (baseNet > 0) net.push({ key: "base", label: "דמי הקמה", value: baseNet });
  for (const i of items) net.push({ key: i.id, label: i.label, value: Number(i.setup_total) });

  const netTotal = net.reduce((t, p) => t + p.value, 0);
  if (netTotal <= 0) return [];

  // The parts MUST sum to the contract total to the agora. If they do not, a
  // customer who pays every part is still short, the contract never settles,
  // and somebody chases them for four agorot. Largest remainder: floor each
  // share, then hand the leftover agorot to the parts that lost the most.
  const dueAgorot = Math.round(defaultPaymentAmount(quote) * 100);
  const exact = net.map((p) => (p.value / netTotal) * dueAgorot);
  const floored = exact.map((v) => Math.floor(v));
  let left = dueAgorot - floored.reduce((t, v) => t + v, 0);

  const order = exact
    .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { idx } of order) {
    if (left <= 0) break;
    floored[idx]! += 1;
    left -= 1;
  }

  // Which parts a live link already covers. A link with no part_keys is a
  // whole-bill link and claims nothing in particular — splitting replaces it,
  // so marking every part as taken would make the picker refuse itself.
  const { data: liveRows } = await admin
    .from("contract_payments")
    .select("id, status, part_keys")
    .eq("contract_id", contractId)
    .in("status", ["pending", "paid"]);

  const claimed = new Map<string, { status: PaymentStatus; paymentId: string }>();
  for (const row of (liveRows ?? []) as Array<{ id: string; status: PaymentStatus; part_keys: string[] | null }>) {
    for (const key of row.part_keys ?? []) {
      // "paid" wins over "pending": a part somebody has actually paid for must
      // never read as merely waiting.
      const held = claimed.get(key);
      if (!held || (held.status !== "paid" && row.status === "paid")) {
        claimed.set(key, { status: row.status, paymentId: row.id });
      }
    }
  }

  return net.map((p, idx) => ({
    key: p.key,
    label: p.label,
    amount: floored[idx]! / 100,
    claimedBy: claimed.get(p.key) ?? null,
  }));
}

export interface PaymentSummary {
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  /** The stable link customers get — ours, which redirects to GROW's page. */
  payUrl: string;
}

/** What a customer-facing page needs to know, by token. */
export async function paymentSummaryForToken(token: string, origin: string): Promise<PaymentSummary | null> {
  const admin = createSupabaseAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("id")
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contract) return null;

  const current = await currentPayment((contract as { id: string }).id);
  if (!current) return null;
  return {
    status: current.status,
    amount: Number(current.amount),
    paidAt: current.paid_at,
    payUrl: `${origin.replace(/\/+$/, "")}/c/${token}/pay`,
  };
}

// ── issuing ──────────────────────────────────────────────────────────────────

interface ContractForPayment {
  id: string;
  contract_number: string;
  status: string;
  public_token: string;
  customer_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  business_phone: string | null;
  customer_email: string | null;
  quote: {
    setup_total: number | string;
    hardware_total: number | string | null;
    vat_percent: number | string;
    customer_phone: string | null;
  } | null;
}

async function loadContractForPayment(where: { id?: string; token?: string }): Promise<ContractForPayment | null> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("contracts")
    .select(
      "id, contract_number, status, public_token, customer_name, contact_name, contact_phone, business_phone, customer_email, " +
        "quote:quotes!contracts_quote_id_fkey(setup_total, hardware_total, vat_percent, customer_phone)"
    )
    .is("deleted_at", null);
  query = where.id ? query.eq("id", where.id) : query.eq("public_token", where.token ?? "");

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load the contract: ${error.message}`);
  if (!data) return null;

  // PostgREST returns a to-one embed as an object, but its types say array.
  const row = data as unknown as Omit<ContractForPayment, "quote"> & { quote: ContractForPayment["quote"] | ContractForPayment["quote"][] };
  const quote = Array.isArray(row.quote) ? (row.quote[0] ?? null) : row.quote;
  return { ...row, quote };
}

export interface IssueOptions {
  /** Overrides the default (one-time total with VAT). Shekels, VAT included. */
  amount?: number | null;
  maxInstallments?: number | null;
  /** The agent asking, or null when the site issues the link on signing. */
  createdBy?: string | null;
  /** Absolute origin for the callback URLs, e.g. https://ezorders.com */
  origin: string;
  ip?: string | null;
  userAgent?: string | null;
  /**
   * "replace" retires whatever link was open — the old behaviour, and still the
   * default, because re-issuing for a corrected amount must not leave the wrong
   * price payable.
   *
   * "add" keeps the others, which is what a split is: two live links, each for
   * part of the bill. It is refused if it would let the contract be
   * over-collected, because two links that add up to more than the debt is how
   * a customer pays twice and the second refund is a phone call.
   */
  mode?: "replace" | "add";
  /**
   * Which payable parts this link covers, by key.
   *
   * Stored, not just sent. Without it the picker has no way to show that הקמה
   * is already claimed — it offers every item, the server refuses the overlap,
   * and the agent is told their selection exceeds a balance nothing on screen
   * explains.
   */
  partKeys?: string[] | null;
  /**
   * What this link is for, named the way the customer recognises it — "הקמה",
   * "עמדת קופה". Reaches GROW, so it appears on the page and on the invoice
   * they issue, which is the whole reason splitting by item beats splitting by
   * an arbitrary number.
   */
  forLabel?: string | null;
}

/**
 * Ask GROW for a payment page and keep the answer.
 *
 * Any earlier link still pending is cancelled first: two open pages for one
 * contract is how a customer pays twice. A link already paid is left alone and
 * refused — the money is in, and a second charge is not a thing this makes.
 */
export async function issuePaymentLink(contractId: string, opts: IssueOptions): Promise<ContractPaymentRow> {
  if (!growEnabled()) throw new PaymentError("תשלום בכרטיס אינו מוגדר באתר (GROW)");

  const contract = await loadContractForPayment({ id: contractId });
  if (!contract) throw new PaymentError("ההסכם לא נמצא");
  if (contract.status !== "signed") throw new PaymentError("אפשר להנפיק קישור תשלום רק להסכם חתום");
  if (!contract.quote) throw new PaymentError("להסכם אין הצעת מחיר מקושרת");

  const mode = opts.mode ?? "replace";
  const admin0 = createSupabaseAdminClient();

  /**
   * A part already sitting in a live link is superseded, never refused.
   *
   * Refusing assumed the earlier link still works, which is the one thing that
   * cannot be assumed: it may have lapsed, or gone to an inbox nobody reads. A
   * customer who wants to pay must always be able to, and the honest answer to
   * "there is already a link for this" is to replace it.
   *
   * Cancelling first is also what keeps the arithmetic right — the amount that
   * link was holding returns to the unclaimed balance before the new link is
   * priced against it. Only PENDING links: a paid one has money behind it.
   */
  if (mode === "add" && opts.partKeys?.length) {
    const { data: pendingRows } = await admin0
      .from("contract_payments")
      .select("id, part_keys")
      .eq("contract_id", contract.id)
      .eq("status", "pending");

    const wanted = new Set(opts.partKeys);
    const superseded = ((pendingRows ?? []) as Array<{ id: string; part_keys: string[] | null }>)
      // No parts means the link covers the whole bill, so it covers these too.
      .filter((r) => !r.part_keys || r.part_keys.some((k) => wanted.has(k)))
      .map((r) => r.id);

    if (superseded.length) {
      await admin0
        .from("contract_payments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .in("id", superseded);
    }
  }

  const existing = await currentPayment(contract.id);

  // Totals rather than the newest row: with a split, one part can be paid while
  // another is still open, and "the newest is not paid" would happily issue a
  // third link for a contract that owes nothing.
  const totals = await contractPaymentTotals(contract.id);
  if (totals && totals.outstanding <= 0) throw new PaymentError("ההסכם הזה כבר שולם במלואו");
  if (mode === "replace" && existing?.status === "paid") {
    throw new PaymentError("ההסכם הזה כבר שולם");
  }

  const amount = round2(Number(opts.amount ?? (mode === "add" ? totals?.unclaimed : null) ?? defaultPaymentAmount(contract.quote)));
  if (!(amount > 0)) throw new PaymentError("הסכום חייב להיות גדול מאפס");

  // A split may never add up to more than the debt. Replacing is exempt: the
  // link being retired is part of what "awaiting" counts, so its own amount
  // would be double-counted against it.
  if (mode === "add" && totals && amount > totals.unclaimed + 0.001) {
    throw new PaymentError(
      totals.unclaimed <= 0
        ? "כל היתרה כבר מכוסה בקישורי תשלום קיימים"
        : `הסכום גבוה מהיתרה שנותרה לחלוקה (${totals.unclaimed.toFixed(2)} ₪)`
    );
  }
  const maxInstallments = Math.max(1, Math.min(36, Math.floor(Number(opts.maxInstallments ?? 1) || 1)));

  const phone =
    growPhone(contract.contact_phone) ??
    growPhone(contract.business_phone) ??
    growPhone(contract.quote.customer_phone);
  if (!phone) throw new PaymentError("להסכם אין מספר טלפון ישראלי תקין — GROW דורש אחד לדף התשלום");

  const admin = createSupabaseAdminClient();
  const origin = opts.origin.replace(/\/+$/, "");
  const id = crypto.randomUUID();

  // The row first, so a GROW answer that never reaches us still leaves a trace.
  const { error: insertError } = await admin.from("contract_payments").insert({
    id,
    contract_id: contract.id,
    amount,
    max_installments: maxInstallments,
    status: "pending",
    created_by: opts.createdBy ?? null,
    for_label: opts.forLabel ?? null,
    part_keys: opts.partKeys?.length ? opts.partKeys : null,
  });
  if (insertError) throw new Error(`Could not record the payment: ${insertError.message}`);

  // A payment link first, because it is the only GROW service that offers a
  // bank transfer — the page below can only ever draw a card, whatever it is
  // asked for. Same customer, same amount, same two handles come back, so
  // everything downstream of here is unchanged.
  //
  // The fall-through is not politeness: until GROW_PR_* exists in this
  // deployment the link cannot be minted, and a signed contract that cannot be
  // paid at all is far worse than one that can only be paid by card. So a
  // refusal is logged and the card page is opened exactly as before.
  // Named for what it covers. "EZOrders - הסכם A-2026-0020 - הקמה" tells a
  // customer holding two links which is which, and GROW prints it on the
  // invoice. The em dashes are folded to hyphens by growSafeText before they
  // are sent; they are written plainly here so the code reads like the rest.
  const title = opts.forLabel
    ? `EZOrders — הסכם ${contract.contract_number} — ${opts.forLabel}`
    : `EZOrders — הסכם ${contract.contract_number}`;

  let created;
  const linkNotify = `${origin}/api/pay/grow/notify/link`;
  if (growLinkEnabled()) {
    try {
      created = await createPaymentLink({
        amount,
        fullName: growFullName(contract.contact_name, contract.customer_name),
        phone,
        email: contract.customer_email,
        title,
        maxInstallments,
        // No query string. GROW refuses a link whose parameters carry special
        // characters, and this one is matched by process id on arrival.
        notifyUrl: linkNotify,
        methods: ["card", "bit", "bank"],
      });
    } catch (error) {
      console.error("[payments] payment link refused, falling back to the card page:", String(error));
    }
  }

  try {
    created ??= await createPaymentProcess({
      amount,
      fullName: growFullName(contract.contact_name, contract.customer_name),
      phone,
      email: contract.customer_email,
      description: title,
      maxInstallments,
      successUrl: `${origin}/c/${contract.public_token}?paid=1`,
      cancelUrl: `${origin}/c/${contract.public_token}?paid=0`,
      notifyUrl: `${origin}/api/pay/grow/notify?p=${id}&s=${notifySecret()}`,
      reference: id,
    });
  } catch (error) {
    await admin.from("contract_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error instanceof GrowError) throw new PaymentError(`GROW סירב: ${error.message}`);
    throw error;
  }

  // Only now, with a page in hand, retire what came before — and only when
  // replacing. A split's whole point is that the sibling link stays alive.
  //
  // Every pending link, not just the newest. "Replace" means this one
  // supersedes what was open, and with a split there can be several; leaving
  // one behind is a customer paying for the same item twice. The new row is
  // excluded by id rather than by timing, because it is already pending.
  if (mode === "replace") {
    await admin
      .from("contract_payments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("contract_id", contract.id)
      .eq("status", "pending")
      .neq("id", id);
  }

  const { data: row, error: updateError } = await admin
    .from("contract_payments")
    .update({
      payment_url: created.paymentUrl,
      grow_process_id: created.processId,
      grow_process_token: created.processToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_COLUMNS)
    .single();
  if (updateError) throw new Error(`Could not store the payment page: ${updateError.message}`);

  await admin.from("contract_events").insert({
    contract_id: contract.id,
    event_type: "payment_link",
    ip: opts.ip ?? null,
    user_agent: opts.userAgent ?? null,
    meta: { payment_id: id, amount, max_installments: maxInstallments, by: opts.createdBy ?? "system" },
  });

  return row as unknown as ContractPaymentRow;
}

/**
 * The page the customer should be sent to, by token: the pending link if there
 * is one, a fresh one if there is none. Null when there is nothing to pay —
 * not signed, already paid, or GROW switched off.
 */
export async function paymentUrlForToken(
  token: string,
  origin: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<{ url: string } | { blocked: "unsigned" | "paid" | "disabled" | "not_found" | "failed"; message?: string }> {
  if (!growEnabled()) return { blocked: "disabled" };

  const contract = await loadContractForPayment({ token });
  if (!contract) return { blocked: "not_found" };
  if (contract.status !== "signed") return { blocked: "unsigned" };

  const current = await currentPayment(contract.id);
  if (current?.status === "paid") return { blocked: "paid" };
  if (current?.status === "pending" && current.payment_url) return { url: current.payment_url };

  try {
    const issued = await issuePaymentLink(contract.id, { origin, createdBy: null, ...meta });
    return issued.payment_url ? { url: issued.payment_url } : { blocked: "failed" };
  } catch (error) {
    return { blocked: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * One specific part of a split, by its own stable address.
 *
 * /c/<token>/pay can only mean "the amount owed" and a split has two of those.
 * Each link therefore gets an address of its own, still ours rather than
 * GROW's, so a customer holding "הקמה" and "עמדה" has two URLs that keep
 * working even if the GROW page behind either is reissued.
 *
 * The token is checked against the payment's contract: a payment id alone must
 * not open somebody else's bill.
 */
export async function paymentUrlForPart(
  token: string,
  paymentId: string
): Promise<{ url: string } | { blocked: "paid" | "not_found" | "cancelled" }> {
  if (!/^[0-9a-f-]{36}$/.test(paymentId)) return { blocked: "not_found" };

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contract_payments")
    .select("id, status, payment_url, contract:contracts!inner(public_token)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!data) return { blocked: "not_found" };

  const row = data as unknown as {
    status: PaymentStatus;
    payment_url: string | null;
    contract: { public_token: string } | { public_token: string }[];
  };
  const contract = Array.isArray(row.contract) ? row.contract[0] : row.contract;
  if (!contract || contract.public_token !== token) return { blocked: "not_found" };

  if (row.status === "paid") return { blocked: "paid" };
  if (row.status === "cancelled") return { blocked: "cancelled" };
  return row.payment_url ? { url: row.payment_url } : { blocked: "not_found" };
}

/** The contract behind a customer's token, for callers that only need the id. */
export async function contractIdForToken(token: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contracts")
    .select("id")
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * The customer choosing what to pay for, on their own.
 *
 * The agent can split a bill before sending it, but they have to know in
 * advance how the customer wants to divide it. This is the other half: the
 * customer opens one link, sees what they bought, ticks what they want to pay
 * now, and gets a GROW page for exactly that. They come back to the same
 * address later for the rest, possibly by a different method.
 *
 * The amount is computed here from the keys and never read from the request.
 * The page posts a selection, not a price — a price in a form is a price a
 * customer can edit.
 */
export async function issueCustomerSelection(
  token: string,
  keys: string[],
  origin: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<{ url: string } | { error: string }> {
  const contract = await loadContractForPayment({ token });
  if (!contract) return { error: "ההסכם לא נמצא" };
  if (contract.status !== "signed") return { error: "אפשר לשלם רק אחרי חתימה על ההסכם" };

  const [parts, totals] = await Promise.all([
    contractPayableParts(contract.id),
    contractPaymentTotals(contract.id),
  ]);
  if (!totals || totals.outstanding <= 0) return { error: "ההסכם הזה כבר שולם" };

  // Only what is genuinely still open. A key that is already paid, or that the
  // customer never had, simply is not in here.
  const openKeys = new Set(parts.filter((p) => p.claimedBy?.status !== "paid").map((p) => p.key));
  const chosen = parts.filter((p) => keys.includes(p.key) && openKeys.has(p.key));
  if (!chosen.length) return { error: "לא נבחר שום פריט לתשלום" };

  const amount = round2(chosen.reduce((t, p) => t + p.amount, 0));
  if (!(amount > 0)) return { error: "הסכום אינו תקין" };

  // Choosing everything that is still open supersedes whatever links exist —
  // including any from before parts were recorded, whose contents nothing can
  // now identify. Without this, a contract carrying one of those older links
  // refuses the customer who simply wants to pay the whole remaining balance,
  // which is the least acceptable dead end on a payment page.
  // Superseding whatever already covers these parts happens inside
  // issuePaymentLink, so the agent's picker and this page cannot drift apart.
  try {
    const row = await issuePaymentLink(contract.id, {
      amount,
      maxInstallments: 1,
      // Everything overlapping is already cancelled above, so this only ever
      // joins what is left. "replace" would wipe the sibling links of a split
      // that has nothing to do with this selection.
      mode: "add",
      forLabel: chosen.map((p) => p.label).join(", "),
      partKeys: chosen.map((p) => p.key),
      createdBy: null,
      origin,
      ...meta,
    });
    return row.payment_url ? { url: row.payment_url } : { error: "לא הצלחנו לפתוח דף תשלום" };
  } catch (error) {
    return { error: error instanceof PaymentError ? error.message : "לא הצלחנו לפתוח דף תשלום" };
  }
}

// ── settling ─────────────────────────────────────────────────────────────────

async function markPaid(
  payment: ContractPaymentRow,
  info: { transactionId: string | null; transactionToken: string | null; notify?: unknown },
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // .neq("status","paid") is what makes this safe to reach twice — GROW calls
  // its notification more than once, and the agent may press "check" as well.
  const { data, error } = await admin
    .from("contract_payments")
    .update({
      status: "paid",
      paid_at: now,
      grow_transaction_id: info.transactionId ?? payment.grow_transaction_id,
      grow_transaction_token: info.transactionToken ?? payment.grow_transaction_token,
      ...(info.notify !== undefined ? { grow_notify: info.notify } : {}),
      updated_at: now,
    })
    .eq("id", payment.id)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not record the payment: ${error.message}`);
  if (!data) return; // already paid; nothing more to say

  await admin.from("contract_events").insert({
    contract_id: payment.contract_id,
    event_type: "paid",
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
    meta: { payment_id: payment.id, amount: Number(payment.amount), transaction_id: info.transactionId },
  });
}

/**
 * Ask GROW how a link went and record the answer. Used by the agent's "check"
 * button and by the notification handler, which trusts GROW's own API over the
 * form it was posted.
 */
export async function refreshPaymentStatus(paymentId: string): Promise<ContractPaymentRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("contract_payments").select(PAYMENT_COLUMNS).eq("id", paymentId).maybeSingle();
  if (error) throw new Error(`Could not load the payment: ${error.message}`);
  const payment = data as unknown as ContractPaymentRow | null;
  if (!payment) throw new PaymentError("קישור התשלום לא נמצא");

  if (payment.status === "paid" || payment.status === "cancelled") return payment;
  if (!payment.grow_process_id || !payment.grow_process_token) {
    throw new PaymentError("ל-GROW אין מזהה תהליך לקישור הזה — יש להנפיק קישור חדש");
  }

  let info;
  try {
    info = await getPaymentProcessInfo(payment.grow_process_id, payment.grow_process_token);
  } catch (error) {
    if (error instanceof GrowError) throw new PaymentError(`GROW: ${error.message}`);
    throw error;
  }

  if (info.outcome === "paid") {
    await markPaid(payment, { transactionId: info.transactionId, transactionToken: info.transactionToken });
  } else if (info.outcome === "cancelled") {
    await admin
      .from("contract_payments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");
  }

  const { data: fresh } = await admin.from("contract_payments").select(PAYMENT_COLUMNS).eq("id", paymentId).single();
  return fresh as unknown as ContractPaymentRow;
}

/**
 * GROW's server-to-server notification. The form says "paid"; the API is asked
 * to confirm before anything is written, because a POST to a public URL is
 * something anyone can send. When the API cannot be asked (no process id was
 * stored), the form alone is not enough and the row is left pending for the
 * agent's "check" to settle later.
 */
export async function recordGrowNotification(
  paymentId: string,
  notification: GrowNotification,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<"paid" | "ignored" | "unconfirmed"> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("contract_payments").select(PAYMENT_COLUMNS).eq("id", paymentId).maybeSingle();
  const payment = data as unknown as ContractPaymentRow | null;
  if (!payment) return "ignored";

  // Keep the notification whatever it says — it is the record if a status is
  // ever disputed.
  await admin
    .from("contract_payments")
    .update({ grow_notify: notification.fields, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  if (payment.status === "paid") return "paid";
  if (!notification.paid) return "ignored";

  if (payment.grow_process_id && payment.grow_process_token) {
    const info = await getPaymentProcessInfo(payment.grow_process_id, payment.grow_process_token);
    if (info.outcome !== "paid") return "unconfirmed";
    await markPaid(
      payment,
      {
        transactionId: info.transactionId ?? notification.transactionId,
        transactionToken: info.transactionToken ?? notification.transactionToken,
      },
      meta
    );
    return "paid";
  }

  return "unconfirmed";
}

// ── the notification secret ──────────────────────────────────────────────────

/**
 * A token in the notify URL, so a stray POST is refused before it costs a GROW
 * call. GROW_NOTIFY_SECRET when set; otherwise derived from the service key,
 * which is already secret and already present wherever this runs.
 */
/**
 * Which payment a link notification belongs to.
 *
 * The page flow puts the payment id in the notify URL. The link flow cannot:
 * GROW refuses a link whose parameters carry special characters, and a query
 * string is exactly that. So the notification is matched on the process id
 * GROW itself reports — the one stored when the link was minted.
 *
 * Losing the secret from the URL costs nothing that mattered. It was only ever
 * a way to refuse a stray POST before spending a GROW call; the thing that
 * actually protects the money is recordGrowNotification asking GROW's own API
 * before writing "paid", and that is unchanged.
 */
export async function paymentIdForProcess(processId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(processId)) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contract_payments")
    .select("id")
    .eq("grow_process_id", processId)
    // A contract can be issued more than one link over its life; the newest is
    // the one a customer is paying.
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export function notifySecret(): string {
  const explicit = (process.env.GROW_NOTIFY_SECRET ?? "").trim();
  if (explicit) return explicit;
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`grow-notify:${seed}`).digest("hex").slice(0, 32);
}
