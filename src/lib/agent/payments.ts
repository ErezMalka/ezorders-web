import "server-only";

import { createHash } from "node:crypto";

import {
  GrowError,
  createPaymentProcess,
  getPaymentProcessInfo,
  growEnabled,
  growFullName,
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
}

export class PaymentError extends Error {}

const PAYMENT_COLUMNS =
  "id, contract_id, amount, currency, max_installments, status, grow_process_id, grow_process_token, " +
  "payment_url, grow_transaction_id, grow_transaction_token, paid_at, created_by, created_at, updated_at";

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

  const existing = await currentPayment(contract.id);
  if (existing?.status === "paid") throw new PaymentError("ההסכם הזה כבר שולם");

  const amount = round2(Number(opts.amount ?? defaultPaymentAmount(contract.quote)));
  if (!(amount > 0)) throw new PaymentError("הסכום חייב להיות גדול מאפס");
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
  });
  if (insertError) throw new Error(`Could not record the payment: ${insertError.message}`);

  let created;
  try {
    created = await createPaymentProcess({
      amount,
      fullName: growFullName(contract.contact_name, contract.customer_name),
      phone,
      email: contract.customer_email,
      description: `EZOrders — הסכם ${contract.contract_number}`,
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

  // Only now, with a page in hand, retire whatever came before it.
  if (existing && existing.status === "pending") {
    await admin
      .from("contract_payments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
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
export function notifySecret(): string {
  const explicit = (process.env.GROW_NOTIFY_SECRET ?? "").trim();
  if (explicit) return explicit;
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`grow-notify:${seed}`).digest("hex").slice(0, 32);
}
