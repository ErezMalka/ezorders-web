import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Orders — the half of the lifecycle that starts when the customer says yes.
 *
 * An order is a frozen copy of the quote it came from, written by
 * create_order_from_quote() in SQL and never assembled here. This module reads
 * orders and moves them along the delivery track; it does not create them,
 * because the only legitimate way an order comes into existence is a recorded
 * acceptance.
 */

export type OrderStatus = "pending_setup" | "in_setup" | "live" | "cancelled";

/** The transitions the portal offers, and what each one means to the customer. */
export const ORDER_FLOW: OrderStatus[] = ["pending_setup", "in_setup", "live"];

export interface OrderListRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  setup_total: number;
  monthly_total: number;
  discount_percent: number;
  currency: string;
  contract_value: number;
  term_months: number;
  accepted_at: string;
  target_live_on: string | null;
  went_live_at: string | null;
  created_at: string;
  agent_id: string;
  agent_name: string;
  quote_number: string;
  public_token: string;
  accept_channel: "customer" | "agent" | null;
  signer_name: string | null;
  days_to_live: number | null;
}

export interface OrderRow extends OrderListRow {
  quote_id: string;
  customer_tax_id: string | null;
  monthly_eligible: number;
  discount_amount: number;
  monthly_non_eligible: number;
  vat_percent: number;
  setup_started_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
}

export interface OrderEventRow {
  id: string;
  event_type: string;
  actor_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AcceptanceRow {
  response: "accepted" | "rejected";
  signer_name: string | null;
  signer_role: string | null;
  signer_tax_id: string | null;
  signer_email: string | null;
  signer_phone: string | null;
  reason: string | null;
  document_hash: string | null;
  ip: string | null;
  user_agent: string | null;
  channel: "customer" | "agent";
  recorded_by: string | null;
  created_at: string;
}

export class OrderError extends Error {}

// ── reads ────────────────────────────────────────────────────
/**
 * Orders, newest first. As with quotes, the scope is RLS's decision: an agent
 * sees their own, a manager sees everyone's.
 */
export async function listOrders(limit = 200): Promise<OrderListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders_list")
    .select("*")
    .order("accepted_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return (data ?? []) as OrderListRow[];
}

export async function getOrder(orderId: string): Promise<
  | (OrderRow & { events: OrderEventRow[]; acceptance: AcceptanceRow | null; recorded_by_name: string | null })
  | null
> {
  const supabase = await createSupabaseServerClient();

  // The base row carries every column; the list view carries the joined names
  // and the derived figures. Reading both is cheaper than duplicating the view's
  // expressions here and letting the two drift.
  const [{ data: order, error }, { data: listRow }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("orders_list").select("*").eq("id", orderId).maybeSingle(),
  ]);

  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (!order || !listRow) return null;

  const [{ data: events }, { data: acceptance }] = await Promise.all([
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    supabase.from("quote_responses").select("*").eq("quote_id", order.quote_id).maybeSingle(),
  ]);

  let recordedByName: string | null = null;
  if (acceptance?.recorded_by) {
    const { data: agent } = await supabase
      .from("agents")
      .select("full_name")
      .eq("id", acceptance.recorded_by)
      .maybeSingle();
    recordedByName = agent?.full_name ?? null;
  }

  return {
    ...(listRow as OrderListRow),
    ...(order as Record<string, unknown>),
    events: (events ?? []) as OrderEventRow[],
    acceptance: (acceptance ?? null) as AcceptanceRow | null,
    recorded_by_name: recordedByName,
  } as OrderRow & {
    events: OrderEventRow[];
    acceptance: AcceptanceRow | null;
    recorded_by_name: string | null;
  };
}

// ── writes ───────────────────────────────────────────────────
/**
 * Move an order along the delivery track.
 *
 * The timestamps are the database's job — a trigger stamps setup_started_at and
 * went_live_at from the status itself, so a screen that forgets to send one
 * cannot leave the column empty forever.
 */
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  actorId: string,
  reason?: string
): Promise<void> {
  if (status === "cancelled" && !reason?.trim()) {
    throw new OrderError("ביטול הזמנה מחייב סיבה");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("orders")
    .update(
      status === "cancelled"
        ? { status, cancel_reason: reason!.trim().slice(0, 500) }
        : { status }
    )
    .eq("id", orderId);

  if (error) throw new OrderError(`עדכון הסטטוס נכשל: ${error.message}`);

  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type:
      status === "in_setup"
        ? "setup_started"
        : status === "live"
          ? "went_live"
          : status === "cancelled"
            ? "cancelled"
            : "status_changed",
    actor_id: actorId,
    meta: reason ? { status, reason } : { status },
  });
}

/** The date we told the customer they would be live. Free text to nobody. */
export async function setTargetLiveOn(orderId: string, date: string | null): Promise<void> {
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new OrderError("תאריך לא תקין");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ target_live_on: date }).eq("id", orderId);
  if (error) throw new OrderError(`עדכון התאריך נכשל: ${error.message}`);
}

export async function setOrderNotes(orderId: string, notes: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ notes: notes.trim().slice(0, 4000) || null })
    .eq("id", orderId);
  if (error) throw new OrderError(`שמירת ההערה נכשלה: ${error.message}`);
}

/**
 * Record a yes that arrived by telephone.
 *
 * Runs as the agent, not the service role: quote_accept_by_agent() checks
 * ownership against auth.uid() inside the function, so the caller's identity has
 * to be the real one.
 */
export async function acceptQuoteAsAgent(
  quoteId: string,
  note?: string
): Promise<{ ok: boolean; code: string; orderNumber?: string }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("quote_accept_by_agent", {
    p_quote_id: quoteId,
    p_note: note ?? null,
  });

  if (error) throw new OrderError(`רישום האישור נכשל: ${error.message}`);

  const result = (data ?? {}) as { ok?: boolean; code?: string; order_number?: string };
  return {
    ok: result.ok === true,
    code: result.code ?? "unknown",
    orderNumber: result.order_number,
  };
}

/**
 * The order a quote turned into, if it did.
 *
 * Read separately rather than joined onto getQuote(): the quote screen is the
 * common case and most quotes never become orders, so this stays a small extra
 * query on one page instead of a join every quote list pays for.
 */
export async function getOrderForQuote(
  quoteId: string
): Promise<{ id: string; order_number: string; status: OrderStatus } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the order for this quote: ${error.message}`);
  return (data ?? null) as { id: string; order_number: string; status: OrderStatus } | null;
}
